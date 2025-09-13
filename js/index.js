/*************************************************************************
   * نظام إدارة البيوتي سنتر - ملف واحد
   * ملاحظات مهمة:
   * - كل البيانات مخزنة في الذاكرة (window.hrSystem.state)
   * - لا يستخدم localStorage أو أي تخزين دائم: عند إعادة تحميل الصفحة تُمحى البيانات
   * - عند إضافة عميل/موظف/خدمة: تظهر أسماؤهم تلقائياً في القوائم المرتبطة
   * - الواجهة بالعربي، متجاوبة، وتعمل عبر DOM الخام
   *************************************************************************/

  (function(){
    // ====== الحالة الأساسية (غير محفوظة) ======
    window.hrSystem = window.hrSystem || {};
    const state = {
      role: 'admin', // admin أو staff
      clients: [], // {id,name,phone,notes}
      employees: [], // {id,name,role,phone}
      services: [], // {id,name,duration,price}
      appointments: [], // {id,clientId,employeeId,serviceId,datetime,status}
      payroll: [], // {id,employeeId,amount,type,notes,date}
      invoices: [], // {id,clientId,items:[{serviceId,qty,price}],total,date,paid}
      inventory: [], // {id,name,qty,cost}
      marketing: [], // {id,channel,content,date}
      users: [ {id:1,username:'admin',role:'admin'} ]
    };
    window.hrSystem.state = state;

    // ====== مُساعِدات ======
    const uid = (prefix='id') => prefix + '_' + Math.random().toString(36).slice(2,9);
    const q = (s,root=document)=>root.querySelector(s);
    const qq = (s,root=document)=>Array.from(root.querySelectorAll(s));

    // ====== الوحدات المراد عرضها ======
    const modules = [
      {id:'dashboard',label:'اللوحة'},
      {id:'clients',label:'المواعيد / العملاء'},
      {id:'employees',label:'الموظفين'},
      {id:'services',label:'الخدمات'},
      {id:'appointments',label:'المواعيد'},
      {id:'payroll',label:'الرواتب والمحاسبة'},
      {id:'cashier',label:'الكاشير والفواتير'},
      {id:'inventory',label:'المخزون'},
      {id:'reports',label:'التقارير'},
      {id:'marketing',label:'التسويق'},
      {id:'security',label:'الصلاحيات والأمان'}
    ];

    // ====== بناء شريط التنقل للماجولات ======
    const nav = q('#modulesNav');
    modules.forEach(m=>{
      const el = document.createElement('div'); el.className='tab'; el.textContent = m.label; el.dataset.id = m.id;
      el.addEventListener('click', ()=>{ setActiveModule(m.id); });
      nav.appendChild(el);
    });

    // ====== إعداد أزرار عليا ======
    q('#toggleRole').addEventListener('click', ()=>{
      state.role = state.role === 'admin' ? 'staff' : 'admin';
      renderHeader(); renderSection();
    });
    q('#resetBtn').addEventListener('click', ()=>{ if(!confirm('هل أنت متأكد من إعادة ضبط كل البيانات في هذه الجلسة؟')) return; resetState(); });
    q('#openReports').addEventListener('click', ()=> setActiveModule('reports'));
    q('#openMarketing').addEventListener('click', ()=> setActiveModule('marketing'));

    q('#globalSearch').addEventListener('input', (e)=>{ renderSection(); });

    // ====== وظائف الحالة ======
    function resetState(){
      state.clients=[]; state.employees=[]; state.services=[]; state.appointments=[]; state.payroll=[]; state.invoices=[]; state.inventory=[]; state.marketing=[];
      renderAllCounts(); renderSection(); alert('تمت إعادة الضبط — جميع البيانات الحالية محذوفة (ذاكرة الصفحة)');
    }

    // ====== واجهات إضافة عناصر مشتركة (يضيف اسم العميل إلى كل القوائم تلقائياً) ======
    function addClient(name,phone,notes){ const obj={id:uid('client'),name,phone,notes}; state.clients.push(obj); renderAllCounts(); syncSelects(); renderSection(); return obj; }
    function addEmployee(name,roleEmp,phone){ const obj={id:uid('emp'),name,role:roleEmp||'عام',phone}; state.employees.push(obj); renderAllCounts(); syncSelects(); renderSection(); return obj; }
    function addService(name,duration,price){ const obj={id:uid('svc'),name,duration,price:parseFloat(price||0)}; state.services.push(obj); renderAllCounts(); syncSelects(); renderSection(); return obj; }
    function addInventory(name,qty,cost){ const obj={id:uid('inv'),name,qty:parseFloat(qty||0),cost:parseFloat(cost||0)}; state.inventory.push(obj); renderAllCounts(); renderSection(); return obj; }

    function syncSelects(){ // تحديث أي قوائم اختيار في DOM عامة
      // كلما تغيرت clients,employees,services يجب تحديث ال select في الواجهات
      qq('select.sync-client').forEach(s=>{
        const val = s.value;
        s.innerHTML = '<option value="">-- اختر عميل --</option>' + state.clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
        if(val) s.value = val;
      });
      qq('select.sync-employee').forEach(s=>{
        const val = s.value;
        s.innerHTML = '<option value="">-- اختر موظف --</option>' + state.employees.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
        if(val) s.value = val;
      });
      qq('select.sync-service').forEach(s=>{
        const val = s.value;
        s.innerHTML = '<option value="">-- اختر خدمة --</option>' + state.services.map(c=>`<option value="${c.id}">${c.name} — ${c.price}₪</option>`).join('');
        if(val) s.value = val;
      });
    }

    // ====== ريندر العدادات ======
    function renderAllCounts(){ q('#countClients').textContent = state.clients.length; q('#countEmployees').textContent = state.employees.length; q('#countServices').textContent = state.services.length; q('#countInventory').textContent = state.inventory.length; }

    // ====== التنقل بين الأقسام ======
    let activeModule = 'dashboard';
    function setActiveModule(id){ activeModule = id; qq('#modulesNav .tab').forEach(t=>t.classList.toggle('active', t.dataset.id===id)); renderSection(); }

    // ====== ريندر الهيدر ======
    function renderHeader(){ q('#currentRole').textContent = 'الدور: ' + (state.role==='admin' ? 'مشرف' : 'موظف'); }

    // ====== ريندر كل قسم ======
    function renderSection(){ renderHeader(); syncSelects(); renderAllCounts(); const area = q('#sectionArea'); area.innerHTML='';
      const search = q('#globalSearch').value.trim().toLowerCase();
      if(activeModule==='dashboard') return area.appendChild(renderDashboard());
      if(activeModule==='clients') return area.appendChild(renderClients(search));
      if(activeModule==='employees') return area.appendChild(renderEmployees(search));
      if(activeModule==='services') return area.appendChild(renderServices(search));
      if(activeModule==='appointments') return area.appendChild(renderAppointments(search));
      if(activeModule==='payroll') return area.appendChild(renderPayroll(search));
      if(activeModule==='cashier') return area.appendChild(renderCashier(search));
      if(activeModule==='inventory') return area.appendChild(renderInventory(search));
      if(activeModule==='reports') return area.appendChild(renderReports());
      if(activeModule==='marketing') return area.appendChild(renderMarketing());
      if(activeModule==='security') return area.appendChild(renderSecurity());
    }

    // ====== عناصر ريندر لكل موديل ======
    function renderDashboard(){ const wrap = document.createElement('div'); wrap.className='card';
      const h = document.createElement('h2'); h.textContent='اللوحة الرئيسية'; wrap.appendChild(h);
      const grid = document.createElement('div'); grid.className='section-grid';

      const c1 = document.createElement('div'); c1.className='card'; c1.innerHTML = `<h3>العملاء</h3><div class="muted">${state.clients.length} عميل</div><div style="height:8px"></div><button class="btn" onclick="(function(){window.hrSystem.addClientPrompt();})()">أضف عميل جديد</button>`;
      const c2 = document.createElement('div'); c2.className='card'; c2.innerHTML = `<h3>الموظفين</h3><div class="muted">${state.employees.length} موظف</div><div style="height:8px"></div><button class="btn" onclick="(function(){window.hrSystem.addEmployeePrompt();})()">أضف موظف</button>`;
      const c3 = document.createElement('div'); c3.className='card'; c3.innerHTML = `<h3>الخدمات</h3><div class="muted">${state.services.length} خدمة</div><div style="height:8px"></div><button class="btn" onclick="(function(){window.hrSystem.addServicePrompt();})()">أضف خدمة</button>`;
      const c4 = document.createElement('div'); c4.className='card'; c4.innerHTML = `<h3>المخزون</h3><div class="muted">${state.inventory.length} صنف</div><div style="height:8px"></div><button class="btn" onclick="(function(){window.hrSystem.addInventoryPrompt();})()">أضف مخزون</button>`;

      grid.appendChild(c1); grid.appendChild(c2); grid.appendChild(c3); grid.appendChild(c4);
      wrap.appendChild(grid);
      return wrap;
    }

    // ====== قسم العملاء ======
    function renderClients(search=''){
      const wrap = document.createElement('div'); wrap.className='card';
      wrap.innerHTML = `<h2>المواعيد / العملاء</h2><div class="muted">أضف أو عدّل بيانات العميل هنا</div>`;
      const form = document.createElement('div'); form.style.marginTop='10px';

      form.innerHTML = `
        <label>اسم العميل</label>
        <input id="clientName" placeholder="الاسم الكامل" />
        <label>الهاتف</label>
        <input id="clientPhone" placeholder="مثال: 09xxxxxxxx" />
        <label>ملاحظات</label>
        <textarea id="clientNotes" rows="2"></textarea>
        <div style="height:8px"></div>
        <div class="flex"><button id="addClientBtn" class="btn success">أضف عميل</button><button id="clearClients" class="btn danger">حذف كل العملاء</button></div>
      `;
      wrap.appendChild(form);

      const listWrap = document.createElement('div'); listWrap.style.marginTop='12px';
      const list = document.createElement('div'); list.className='list';
      const filtered = state.clients.filter(c=>c.name.toLowerCase().includes(search) || (c.phone||'').includes(search));
      if(filtered.length===0) list.innerHTML = '<div class="muted">لا توجد نتائج</div>';
      filtered.forEach(c=>{
        const it = document.createElement('div'); it.className='item'; it.innerHTML = `<div><strong>${c.name}</strong><div class="muted">${c.phone || ''}</div></div><div class="flex"><button class="btn" data-id="${c.id}" onclick="(function(id){window.hrSystem.editClient(id)})(this.dataset.id)">تعديل</button><button class="btn danger" data-id="${c.id}" onclick="(function(id){window.hrSystem.deleteClient(id)})(this.dataset.id)">حذف</button></div>`;
        list.appendChild(it);
      });
      listWrap.appendChild(list); wrap.appendChild(listWrap);

      // أحداث
      setTimeout(()=>{
        q('#addClientBtn').addEventListener('click', ()=>{
          const name=q('#clientName').value.trim(); const phone=q('#clientPhone').value.trim(); const notes=q('#clientNotes').value.trim();
          if(!name){ alert('الاسم مطلوب'); return; }
          addClient(name,phone,notes); q('#clientName').value=''; q('#clientPhone').value=''; q('#clientNotes').value='';
        });
        q('#clearClients').addEventListener('click', ()=>{ if(!confirm('حذف كل العملاء؟')) return; state.clients=[]; syncSelects(); renderSection(); });
      },50);

      return wrap;
    }

    window.hrSystem.editClient = function(id){
      const c = state.clients.find(x=>x.id===id); if(!c) return alert('غير موجود');
      const newName = prompt('الاسم', c.name); if(!newName) return; c.name=newName; c.phone = prompt('هاتف', c.phone)||c.phone; c.notes = prompt('ملاحظات', c.notes)||c.notes; syncSelects(); renderSection();
    }
    window.hrSystem.deleteClient = function(id){ if(!confirm('حذف العميل؟')) return; state.clients = state.clients.filter(x=>x.id!==id); syncSelects(); renderSection(); }

    // ====== قسم الموظفين ======
    function renderEmployees(search=''){
      const wrap = document.createElement('div'); wrap.className='card'; wrap.innerHTML = `<h2>الموظفين</h2><div class="muted">أضف أو عدّل بيانات الموظف هنا</div>`;
      const form = document.createElement('div'); form.style.marginTop='10px';
      form.innerHTML = `
        <label>الاسم</label><input id="empName" placeholder="مثال: ريم" />
        <label>دور الموظف</label><input id="empRole" placeholder="مثلاً: مصفف، خبيرة تجميل" />
        <label>هاتف</label><input id="empPhone" />
        <div style="height:8px"></div>
        <div class="flex"><button id="addEmpBtn" class="btn success">أضف موظف</button><button id="clearEmp" class="btn danger">حذف كل الموظفين</button></div>
      `;
      wrap.appendChild(form);

      const list = document.createElement('div'); list.className='list'; const filtered = state.employees.filter(e=>e.name.toLowerCase().includes(search) || (e.role||'').includes(search));
      if(filtered.length===0) list.innerHTML = '<div class="muted">لا يوجد موظفين</div>';
      filtered.forEach(e=>{ const it = document.createElement('div'); it.className='item'; it.innerHTML = `<div><strong>${e.name}</strong><div class="muted">${e.role} — ${e.phone||''}</div></div><div class="flex"><button class="btn" onclick="(function(id){window.hrSystem.editEmployee(id)})(this.dataset.id)" data-id="${e.id}">تعديل</button><button class="btn danger" onclick="(function(id){window.hrSystem.deleteEmployee(id)})(this.dataset.id)" data-id="${e.id}">حذف</button></div>`; list.appendChild(it); });
      wrap.appendChild(list);

      setTimeout(()=>{
        q('#addEmpBtn').addEventListener('click', ()=>{
          const name=q('#empName').value.trim(); const roleEmp=q('#empRole').value.trim(); const phone=q('#empPhone').value.trim();
          if(!name){ alert('اسم الموظف مطلوب'); return; }
          addEmployee(name,roleEmp,phone); q('#empName').value=''; q('#empRole').value=''; q('#empPhone').value='';
        });
        q('#clearEmp').addEventListener('click', ()=>{ if(!confirm('حذف كل الموظفين؟')) return; state.employees=[]; syncSelects(); renderSection(); });
      },50);

      return wrap;
    }
    window.hrSystem.editEmployee = function(id){ const e = state.employees.find(x=>x.id===id); if(!e) return; e.name = prompt('الاسم', e.name) || e.name; e.role = prompt('الدور', e.role) || e.role; e.phone = prompt('الهاتف', e.phone) || e.phone; syncSelects(); renderSection(); }
    window.hrSystem.deleteEmployee = function(id){ if(!confirm('حذف الموظف؟')) return; state.employees = state.employees.filter(x=>x.id!==id); syncSelects(); renderSection(); }

    // ====== قسم الخدمات ======
    function renderServices(search=''){
      const wrap = document.createElement('div'); wrap.className='card'; wrap.innerHTML = `<h2>الخدمات</h2><div class="muted">أضف الخدمات والأسعار والمدة</div>`;
      const html = `
        <label>اسم الخدمة</label><input id="svcName" />
        <label>المدة (دقائق)</label><input id="svcDuration" />
        <label>السعر</label><input id="svcPrice" />
        <div style="height:8px"></div>
        <div class="flex"><button id="addSvcBtn" class="btn success">أضف خدمة</button><button id="clearSvc" class="btn danger">حذف كل الخدمات</button></div>
      `;
      wrap.insertAdjacentHTML('beforeend', html);

      const list = document.createElement('div'); list.className='list'; const filtered = state.services.filter(s=>s.name.toLowerCase().includes(search));
      if(filtered.length===0) list.innerHTML = '<div class="muted">لا توجد خدمات</div>';
      filtered.forEach(svc=>{ const it=document.createElement('div'); it.className='item'; it.innerHTML=`<div><strong>${svc.name}</strong><div class="muted">${svc.duration} دقيقة — ${svc.price}₪</div></div><div class="flex"><button class="btn" data-id="${svc.id}" onclick="(function(id){window.hrSystem.editService(id)})(this.dataset.id)">تعديل</button><button class="btn danger" data-id="${svc.id}" onclick="(function(id){window.hrSystem.deleteService(id)})(this.dataset.id)">حذف</button></div>`; list.appendChild(it); });
      wrap.appendChild(list);

      setTimeout(()=>{
        q('#addSvcBtn').addEventListener('click', ()=>{ const name=q('#svcName').value.trim(); const dur=q('#svcDuration').value.trim(); const price=q('#svcPrice').value.trim(); if(!name){alert('اسم الخدمة مطلوب');return;} addService(name,dur,price); q('#svcName').value=''; q('#svcDuration').value=''; q('#svcPrice').value=''; });
        q('#clearSvc').addEventListener('click', ()=>{ if(!confirm('حذف كل الخدمات؟')) return; state.services=[]; syncSelects(); renderSection(); });
      },50);

      return wrap;
    }
    window.hrSystem.editService = function(id){ const s = state.services.find(x=>x.id===id); if(!s) return; s.name = prompt('اسم الخدمة', s.name)||s.name; s.duration = prompt('المدة بالدقائق', s.duration)||s.duration; s.price = parseFloat(prompt('السعر', s.price)||s.price); syncSelects(); renderSection(); }
    window.hrSystem.deleteService = function(id){ if(!confirm('حذف الخدمة؟')) return; state.services = state.services.filter(x=>x.id!==id); syncSelects(); renderSection(); }

    // ====== قسم المواعيد ======
    function renderAppointments(search=''){
      const wrap = document.createElement('div'); wrap.className='card'; wrap.innerHTML = `<h2>المواعيد</h2><div class="muted">حدد عميل، خدمة، وموظف ثم احجز الموعد</div>`;
      const html = `
        <label>العميل</label><select class="sync-client"></select>
        <label>الخدمة</label><select class="sync-service"></select>
        <label>الموظف</label><select class="sync-employee"></select>
        <label>التاريخ والوقت</label><input id="apptDate" type="datetime-local" />
        <div style="height:8px"></div>
        <div class="flex"><button id="addApptBtn" class="btn success">احجز الموعد</button><button id="clearAppt" class="btn danger">مسح كل المواعيد</button></div>
      `;
      wrap.insertAdjacentHTML('beforeend', html);

      const list = document.createElement('div'); list.className='list';
      const filtered = state.appointments.filter(a=>{
        const client = state.clients.find(c=>c.id===a.clientId); return !search || (client && client.name.toLowerCase().includes(search));
      });
      if(filtered.length===0) list.innerHTML = '<div class="muted">لا توجد مواعيد</div>';
      filtered.forEach(a=>{
        const client = state.clients.find(c=>c.id===a.clientId) || {name:'—'};
        const svc = state.services.find(s=>s.id===a.serviceId) || {name:'—'};
        const emp = state.employees.find(e=>e.id===a.employeeId) || {name:'—'};
        const it = document.createElement('div'); it.className='item'; it.innerHTML = `<div><strong>${client.name}</strong><div class="muted">${svc.name} — ${emp.name} — ${new Date(a.datetime).toLocaleString()}</div></div><div class="flex"><button class="btn" data-id="${a.id}" onclick="(function(id){window.hrSystem.cancelAppointment(id)})(this.dataset.id)">إلغاء</button></div>`; list.appendChild(it);
      });
      wrap.appendChild(list);

      setTimeout(()=>{
        syncSelects();
        q('#addApptBtn').addEventListener('click', ()=>{
          const clientId = q('select.sync-client').value; const serviceId = q('select.sync-service').value; const employeeId = q('select.sync-employee').value; const dt = q('#apptDate').value;
          if(!clientId || !serviceId || !employeeId || !dt){ alert('الرجاء تعبئة كل الحقول'); return; }
          const obj = {id:uid('appt'),clientId,serviceId,employeeId,datetime:dt,status:'scheduled'}; state.appointments.push(obj); renderSection();
        });
        q('#clearAppt').addEventListener('click', ()=>{ if(!confirm('حذف كل المواعيد؟')) return; state.appointments=[]; renderSection(); });
      },50);

      return wrap;
    }
    window.hrSystem.cancelAppointment = function(id){ if(!confirm('إلغاء الموعد؟')) return; state.appointments = state.appointments.filter(x=>x.id!==id); renderSection(); }

    // ====== قسم الرواتب والمحاسبة ======
    function renderPayroll(){ const wrap=document.createElement('div'); wrap.className='card'; wrap.innerHTML=`<h2>الرواتب والمحاسبة</h2><div class="muted">أضف دفعات رواتب ومصروفات</div>`;
      const html=`
        <label>الموظف</label><select class="sync-employee"></select>
        <label>المبلغ</label><input id="payAmount" />
        <label>النوع (راتب/مصروف)</label><select id="payType"><option value="salary">راتب</option><option value="expense">مصروف</option></select>
        <label>ملاحظة</label><input id="payNote" />
        <div style="height:8px"></div>
        <div class="flex"><button id="addPayBtn" class="btn success">أضف حركة</button><button id="clearPay" class="btn danger">حذف كل الحركات</button></div>
      `;
      wrap.insertAdjacentHTML('beforeend', html);

      const table = document.createElement('div'); table.style.marginTop='12px';
      if(state.payroll.length===0) table.innerHTML='<div class="muted">لا توجد حركات مالية</div>';
      else{ const t = document.createElement('table'); t.innerHTML = '<thead><tr><th>الموظف</th><th>المبلغ</th><th>النوع</th><th>التاريخ</th></tr></thead>'; const tbody = document.createElement('tbody'); state.payroll.slice().reverse().forEach(p=>{ const emp = state.employees.find(e=>e.id===p.employeeId)||{name:'—'}; const tr=document.createElement('tr'); tr.innerHTML=`<td>${emp.name}</td><td>${p.amount}</td><td>${p.type}</td><td>${new Date(p.date).toLocaleString()}</td>`; tbody.appendChild(tr); }); t.appendChild(tbody); table.appendChild(t); }
      wrap.appendChild(table);

      setTimeout(()=>{
        syncSelects(); q('#addPayBtn').addEventListener('click', ()=>{ const empId=q('select.sync-employee').value; const amt=parseFloat(q('#payAmount').value); const type=q('#payType').value; const note=q('#payNote').value; if(!empId||isNaN(amt)){ alert('اختر موظفًا وادخل مبلغًا صحيحًا'); return; } state.payroll.push({id:uid('pay'),employeeId:empId,amount:amt,type:type,notes:note,date:new Date().toISOString()}); renderSection(); });
        q('#clearPay').addEventListener('click', ()=>{ if(!confirm('حذف كل الحركات؟')) return; state.payroll=[]; renderSection(); });
      },50);

      return wrap; }

    // ====== قسم الكاشير والفواتير ======
    function renderCashier(){ const wrap=document.createElement('div'); wrap.className='card'; wrap.innerHTML='<h2>الكاشير والفواتير</h2><div class="muted">أعد فاتورة لعميل من خدمات متعددة</div>';
      const html=`
        <label>العميل</label><select class="sync-client"></select>
        <label>إضافة خدمة إلى الفاتورة</label>
        <div class="flex"><select class="sync-service" id="cashService"></select><input id="cashQty" placeholder="الكمية" value="1" style="width:80px" /></div>
        <div style="height:8px"></div>
        <div class="flex"><button id="addToCart" class="btn">أضف إلى الفاتورة</button><button id="createInvoice" class="btn success">إنشاء فاتورة</button></div>
        <div style="height:8px"></div>
        <div id="invoiceCart" class="card"></div>
      `;
      wrap.insertAdjacentHTML('beforeend', html);

      setTimeout(()=>{
        syncSelects(); const cart=[]; const renderCart = ()=>{ const el = q('#invoiceCart'); if(cart.length===0) el.innerHTML='<div class="muted">سلة فارغة</div>'; else{ const rows = cart.map((it,i)=>{ const svc = state.services.find(s=>s.id===it.serviceId)||{name:'—'}; return `<div class="item"><div>${svc.name} x ${it.qty}</div><div class="flex"><div>${(it.price*it.qty).toFixed(2)}</div><button class="btn danger" data-i="${i}">حذف</button></div></div>`; }).join(''); el.innerHTML = rows + `<div style="height:8px"></div><div class="muted">الإجمالي: ${cart.reduce((s,i)=>s+i.price*i.qty,0).toFixed(2)} ₪</div>`; qq('#invoiceCart .btn.danger').forEach(b=>b.addEventListener('click', ()=>{ cart.splice(parseInt(b.dataset.i),1); renderCart(); })); }};
        q('#addToCart').addEventListener('click', ()=>{ const svcId=q('#cashService').value; const qty=parseFloat(q('#cashQty').value)||1; if(!svcId){ alert('اختر خدمة'); return; } const svc = state.services.find(s=>s.id===svcId); cart.push({serviceId:svcId,qty:qty,price:svc.price}); renderCart(); });
        q('#createInvoice').addEventListener('click', ()=>{ const clientId=q('select.sync-client').value; if(!clientId){ alert('اختر عميلًا'); return; } if(cart.length===0){ alert('السلة فارغة'); return; } const total = cart.reduce((s,i)=>s+i.price*i.qty,0); const inv = {id:uid('invf'),clientId,items:cart.slice(),total,date:new Date().toISOString(),paid:false}; state.invoices.push(inv); cart.length=0; renderSection(); alert('تم إنشاء الفاتورة — يمكنك عرضها في قائمة الفواتير'); });
      },50);

      // عرض الفواتير أسفل
      const invList = document.createElement('div'); invList.style.marginTop='12px'; if(state.invoices.length===0) invList.innerHTML='<div class="muted">لا توجد فواتير</div>'; else{ invList.innerHTML = state.invoices.slice().reverse().map(inv=>{ const cl = state.clients.find(c=>c.id===inv.clientId)||{name:'—'}; return `<div class="item"><div><strong>فاتورة ${inv.id}</strong><div class="muted">${cl.name} — ${new Date(inv.date).toLocaleString()}</div></div><div class="flex"><div class="muted">${inv.total.toFixed(2)}₪</div></div></div>`; }).join(''); }
      wrap.appendChild(invList);
      return wrap; }

    // ====== قسم المخزون ======
    function renderInventory(search=''){
      const wrap = document.createElement('div'); wrap.className='card'; wrap.innerHTML='<h2>المخزون</h2><div class="muted">أضف/حرر مخزون المواد</div>';
      const html = `
        <label>اسم الصنف</label><input id="invName" />
        <label>الكمية</label><input id="invQty" />
        <label>تكلفة الوحدة</label><input id="invCost" />
        <div style="height:8px"></div>
        <div class="flex"><button id="addInvBtn" class="btn success">أضف/تحديث صنف</button><button id="clearInv" class="btn danger">حذف كل الأصناف</button></div>
      `;
      wrap.insertAdjacentHTML('beforeend', html);
      const list = document.createElement('div'); list.className='list'; if(state.inventory.length===0) list.innerHTML='<div class="muted">لا يوجد أصناف</div>';
      state.inventory.forEach(itm=>{ const el=document.createElement('div'); el.className='item'; el.innerHTML = `<div><strong>${itm.name}</strong><div class="muted">${itm.qty} — تكلفة: ${itm.cost}</div></div><div class="flex"><button class="btn" data-id="${itm.id}">تعديل</button><button class="btn danger" data-id="${itm.id}">حذف</button></div>`; list.appendChild(el); });
      wrap.appendChild(list);

      setTimeout(()=>{
        q('#addInvBtn').addEventListener('click', ()=>{ const name=q('#invName').value.trim(); const qty=parseFloat(q('#invQty').value); const cost=parseFloat(q('#invCost').value); if(!name||isNaN(qty)||isNaN(cost)){ alert('الرجاء تعبئة الحقول بشكل صحيح'); return; } // اذا الاسم موجود: تحديث
          const existing = state.inventory.find(x=>x.name===name); if(existing){ existing.qty += qty; existing.cost = cost; } else addInventory(name,qty,cost); q('#invName').value=''; q('#invQty').value=''; q('#invCost').value=''; renderSection(); });
        q('#clearInv').addEventListener('click', ()=>{ if(!confirm('حذف كل المخزون؟')) return; state.inventory=[]; renderSection(); });
        qq('.list .item .btn').forEach(b=>{ b.addEventListener('click', ()=>{ const id=b.dataset.id; const action = b.classList.contains('danger') ? 'delete' : 'edit'; if(action==='delete'){ if(!confirm('حذف الصنف؟')) return; state.inventory = state.inventory.filter(x=>x.id!==id); renderSection(); } else { const it = state.inventory.find(x=>x.id===id); if(!it) return; const n = prompt('الاسم', it.name); const qy = prompt('الكمية', it.qty); const cs = prompt('التكلفة', it.cost); it.name = n||it.name; it.qty = parseFloat(qy)||it.qty; it.cost = parseFloat(cs)||it.cost; renderSection(); } }); });
      },50);

      return wrap;
    }

    // ====== التقارير ======
    function renderReports(){ const wrap=document.createElement('div'); wrap.className='card'; wrap.innerHTML='<h2>التقارير</h2><div class="muted">ملخص سريع للنشاط</div>';
      const sales = state.invoices.reduce((s,i)=>s+i.total,0); const payrollTot = state.payroll.reduce((s,p)=> s + (p.type==='salary'?p.amount:0),0);
      wrap.insertAdjacentHTML('beforeend', `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:12px"><div class="card"><h4>إجمالي المبيعات</h4><div class="muted">${sales.toFixed(2)}₪</div></div><div class="card"><h4>الرواتب المدفوعة</h4><div class="muted">${payrollTot.toFixed(2)}₪</div></div><div class="card"><h4>إجمالي العملاء</h4><div class="muted">${state.clients.length}</div></div><div class="card"><h4>عدد الخدمات</h4><div class="muted">${state.services.length}</div></div></div>`);
      return wrap; }

    // ====== التسويق ======
    function renderMarketing(){ const wrap=document.createElement('div'); wrap.className='card'; wrap.innerHTML='<h2>التسويق</h2><div class="muted">سجل الحملات والمحتوى</div>';
      const html=`
        <label>القناة</label><input id="mktChannel" placeholder="Instagram/Facebook/SMS" />
        <label>المحتوى</label><textarea id="mktContent"></textarea>
        <div style="height:8px"></div>
        <div class="flex"><button id="addMkt" class="btn success">أضف حملة</button><button id="clearMkt" class="btn danger">حذف الكل</button></div>
      `;
      wrap.insertAdjacentHTML('beforeend', html);
      const list = document.createElement('div'); list.className='list'; if(state.marketing.length===0) list.innerHTML='<div class="muted">لا حملات</div>';
      state.marketing.slice().reverse().forEach(m=>{ const el=document.createElement('div'); el.className='item'; el.innerHTML=`<div><strong>${m.channel}</strong><div class="muted">${m.content}</div></div><div class="muted">${new Date(m.date).toLocaleString()}</div>`; list.appendChild(el); }); wrap.appendChild(list);

      setTimeout(()=>{ q('#addMkt').addEventListener('click', ()=>{ const ch=q('#mktChannel').value.trim(); const ct=q('#mktContent').value.trim(); if(!ch||!ct){ alert('القناة والمحتوى مطلوبان'); return; } state.marketing.push({id:uid('mkt'),channel:ch,content:ct,date:new Date().toISOString()}); renderSection(); }); q('#clearMkt').addEventListener('click', ()=>{ if(!confirm('حذف كل الحملات؟')) return; state.marketing=[]; renderSection(); }); },50);

      return wrap; }

    // ====== الصلاحيات والأمان ======
    function renderSecurity(){ const wrap=document.createElement('div'); wrap.className='card'; wrap.innerHTML='<h2>الصلاحيات والأمان</h2><div class="muted">تبديل الدور وتجربة قيود بسيطة</div>';
      const html = `
        <label>الحسابات</label>
        <div class="muted">${state.users.map(u=>u.username+' ('+u.role+')').join(', ')}</div>
        <div style="height:8px"></div>
        <label>إنشاء مستخدم تجريبي</label>
        <input id="secUser" placeholder="اسم المستخدم" />
        <select id="secRole"><option value="admin">مشرف</option><option value="staff">موظف</option></select>
        <div style="height:8px"></div>
        <div class="flex"><button id="createUser" class="btn">إنشاء</button><button id="delUsers" class="btn danger">حذف الكل</button></div>
      `;
      wrap.insertAdjacentHTML('beforeend', html);
      setTimeout(()=>{ q('#createUser').addEventListener('click', ()=>{ const name=q('#secUser').value.trim(); const role=q('#secRole').value; if(!name){ alert('الاسم مطلوب'); return; } state.users.push({id:uid('usr'),username:name,role}); renderSection(); }); q('#delUsers').addEventListener('click', ()=>{ if(!confirm('حذف كل المستخدمين؟')) return; state.users=[{id:1,username:'admin',role:'admin'}]; renderSection(); }); },50);
      return wrap; }

    // ====== نوافذ إدخال سريعة مأدجية للاستخدامات السريعة من اللوحة ======
    window.hrSystem.addClientPrompt = function(){ const name = prompt('اسم العميل'); if(!name) return; const phone = prompt('الهاتف (اختياري)')||''; addClient(name,phone,''); };
    window.hrSystem.addEmployeePrompt = function(){ const name = prompt('اسم الموظف'); if(!name) return; const role = prompt('دور الموظف')||'عام'; addEmployee(name,role,''); };
    window.hrSystem.addServicePrompt = function(){ const name = prompt('اسم الخدمة'); if(!name) return; const dur = prompt('المدة بالدقائق')||30; const price = prompt('السعر')||0; addService(name,dur,price); };
    window.hrSystem.addInventoryPrompt = function(){ const name=prompt('اسم الصنف'); if(!name) return; const qty=parseFloat(prompt('الكمية')||0); const cost=parseFloat(prompt('التكلفة')||0); addInventory(name,qty,cost); };

    // expose useful helpers for dev/debug
    window.hrSystem.syncSelects = syncSelects;
    window.hrSystem.addClient = addClient;
    window.hrSystem.addEmployee = addEmployee;
    window.hrSystem.addService = addService;
    window.hrSystem.addInventory = addInventory;

    // init
    setActiveModule('dashboard'); renderHeader(); renderAllCounts();

  })();

  