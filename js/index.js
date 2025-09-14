  /* ====== نظام الحالة داخل الجلسة (DOM فقط — لا حفظ) ====== */
    window.hrSystem = (function(){
      const state = {
        clients: [],
        employees: [],
        services: [],
        appointments: [],
        payrolls: [],
        invoices: [],
        currentInvoice: [],
        stock: [],
        roles: [],
        invoiceCounter: 1
      };

      /* ====== أدوات مساعدة لDOM ====== */
      function qs(id){return document.getElementById(id)}
      function el(tag,attrs){const e=document.createElement(tag);if(attrs){Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v))}return e}

      /* ====== بناء الشريط الجانبي ديناميكياً ====== */
      const sections = [
        {id:'dashboard',label:'اللوحة'},
        {id:'appointments',label:'المواعيد'},
        {id:'employees',label:'الموظفين'},
        {id:'services',label:'الخدمات'},
        {id:'payroll',label:'الرواتب والمحاسبة'},
        {id:'cashier',label:'الكاشير والفواتير'},
        {id:'inventory',label:'المخزون'},
        {id:'reports',label:'التقارير'},
        {id:'marketing',label:'التسويق'},
        {id:'security',label:'الصلاحيات والأمان'}
      ];

      function buildNav(){
        const nav = qs('mainNav');nav.innerHTML='';
        sections.forEach(s=>{
          const btn = el('button');btn.textContent=s.label;btn.dataset.target=s.id;
          btn.addEventListener('click',()=>showSection(s.id,btn));
          nav.appendChild(btn);
        });
        // Activate dashboard initially
        const first = nav.querySelector('button');if(first)first.classList.add('active');
      }

      function showSection(id,btn){
        // toggle active class
        document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));
        if(btn)btn.classList.add('active');
        document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
        const sec = qs(id);
        if(sec)sec.classList.add('active');
        qs('sectionTitle').textContent = sections.find(x=>x.id===id)?.label || 'قسم';
        refreshAllSelects();
      }

      /* ====== تحديث الأدوات المختارة (Selects) عبر الجلسة ====== */
      function refreshAllSelects(){
        // clients selects
        const apptClient = qs('apptClient'); const invoiceClient = qs('invoiceClient');
        [apptClient, invoiceClient].forEach(s=>{ if(!s) return; s.innerHTML=''; const opt0=el('option'); opt0.value=''; opt0.textContent='-- اختر زبون --'; s.appendChild(opt0); state.clients.forEach((c,i)=>{const o=el('option');o.value=i;o.textContent=c.name; s.appendChild(o)})});
        // employee selects
        const apptEmployee = qs('apptEmployee'); const payEmployee = qs('payEmployee');
        [apptEmployee,payEmployee].forEach(s=>{ if(!s) return; s.innerHTML=''; const opt0=el('option'); opt0.value=''; opt0.textContent='-- اختر موظف --'; s.appendChild(opt0); state.employees.forEach((e,i)=>{const o=el('option');o.value=i;o.textContent=e.name; s.appendChild(o)})});
        // services selects
        const apptService = qs('apptService'); const invoiceService = qs('invoiceService');
        [apptService,invoiceService].forEach(s=>{ if(!s) return; s.innerHTML=''; const opt0=el('option'); opt0.value=''; opt0.textContent='-- اختر خدمة --'; s.appendChild(opt0); state.services.forEach((sv,i)=>{const o=el('option');o.value=i;o.textContent=sv.name+' — '+sv.price+'₪'; s.appendChild(o)})});
        updateSummary();
      }

      /* ====== وظائف CRUD لكل قسم (تحديث الجداول) ====== */
      // عملاء (نستخدم نفس قائمة العملاء لأغراض الحجز والفواتير)
      function addClient(name){ if(!name||!name.trim()) return alert('أدخل اسم الزبون'); state.clients.push({name: name.trim()}); renderClients();}
      function renderClients(){ refreshAllSelects(); updateSummary(); }

      // موظفين
      function addEmployee(name,role,salary){ if(!name||!name.trim()) return alert('أدخل اسم الموظف'); const s=Number(salary)||0; state.employees.push({name:name.trim(),role:role||'',salary:s}); renderEmployees(); }
      function renderEmployees(){ const tbody = qs('empTable').querySelector('tbody'); tbody.innerHTML=''; state.employees.forEach((e,i)=>{const tr=el('tr'); tr.innerHTML=`<td>${e.name}</td><td>${e.role}</td><td>${e.salary}</td><td><button data-i="${i}" class="btn ghost small editEmp">حذف</button></td>`; tbody.appendChild(tr)}); refreshAllSelects(); }

      // خدمات
      function addService(name,duration,price){ if(!name||!name.trim()) return alert('أدخل اسم الخدمة'); state.services.push({name:name.trim(),duration:Number(duration)||30,price:Number(price)||0}); renderServices(); }
      function renderServices(){ const tbody = qs('serviceTable').querySelector('tbody'); tbody.innerHTML=''; state.services.forEach((s,i)=>{const tr=el('tr'); tr.innerHTML=`<td>${s.name}</td><td>${s.duration} دقيقة</td><td>${s.price}</td><td><button data-i="${i}" class="btn ghost small editSrv">حذف</button></td>`; tbody.appendChild(tr)}); refreshAllSelects(); }

      // مواعيد
      function addAppointment(clientIndex,empIndex,serviceIndex,datetime){ if(clientIndex==='') return alert('اختر زبون'); if(empIndex==='') return alert('اختر موظف'); if(serviceIndex==='') return alert('اختر خدمة'); if(!datetime) return alert('حدد التاريخ والوقت'); const appt={clientIdx:Number(clientIndex),empIdx:Number(empIndex),srvIdx:Number(serviceIndex),datetime:new Date(datetime).toISOString(),status:'مجدول'}; state.appointments.push(appt); renderAppointments(); }
      function renderAppointments(){ const tbody=qs('apptTable').querySelector('tbody'); tbody.innerHTML=''; state.appointments.forEach((a,i)=>{const client=state.clients[a.clientIdx]?.name||'-'; const emp=state.employees[a.empIdx]?.name||'-'; const srv=state.services[a.srvIdx]?.name||'-'; const time = new Date(a.datetime).toLocaleString(); const tr=el('tr'); tr.innerHTML=`<td>${client}</td><td>${emp}</td><td>${srv}</td><td>${time}</td><td>${a.status}</td><td><button data-i="${i}" class="btn ghost small finishAppt">أتم</button> <button data-i="${i}" class="btn ghost small delAppt">حذف</button></td>`; tbody.appendChild(tr)}); updateSummary(); }

      // رواتب
      function issuePayroll(empIndex,month, deduction, bonus){ if(empIndex==='') return alert('اختر موظف'); if(!month) return alert('اختر شهر'); const emp=state.employees[Number(empIndex)]; const base = Number(emp.salary)||0; const net = base - Number(deduction||0) + Number(bonus||0); state.payrolls.push({empName:emp.name,month,net,details:{base,deduction:Number(deduction||0),bonus:Number(bonus||0)}}); renderPayrolls(); }
      function renderPayrolls(){ const tbody=qs('payTable').querySelector('tbody'); tbody.innerHTML=''; state.payrolls.forEach((p,i)=>{const tr=el('tr'); tr.innerHTML=`<td>${p.empName}</td><td>${p.month}</td><td>${p.net}</td><td>الأساس: ${p.details.base} خصم: ${p.details.deduction} علاوة: ${p.details.bonus}</td>`; tbody.appendChild(tr)}); updateSummary(); }

      // فواتير وكاشير
      function addToCurrentInvoice(srvIdx,qty){ if(srvIdx==='') return alert('اختر خدمة'); const srv = state.services[Number(srvIdx)]; state.currentInvoice.push({srvIdx:Number(srvIdx),qty:Number(qty||1),unitPrice: srv.price}); renderCurrentInvoice(); }
      function renderCurrentInvoice(){ const tbody=qs('invoiceTable').querySelector('tbody'); tbody.innerHTML=''; let total=0; state.currentInvoice.forEach((it,i)=>{ const name=state.services[it.srvIdx]?.name||'-'; const sum = it.qty*it.unitPrice; total+=sum; const tr=el('tr'); tr.innerHTML=`<td>${name}</td><td>${it.qty}</td><td>${it.unitPrice}</td><td>${sum}</td><td><button data-i="${i}" class="btn ghost small delInvItem">حذف</button></td>`; tbody.appendChild(tr)}); qs('invoiceTotal').textContent=total; updateSummary(); }
      function finalizeInvoice(clientIdx){ const total = Number(qs('invoiceTotal').textContent)||0; const clientName = clientIdx===''? 'عميل نقدي' : state.clients[Number(clientIdx)]?.name || 'عميل'; const inv = {number: state.invoiceCounter++, client:clientName, items: [...state.currentInvoice], total, date: new Date().toLocaleString()}; state.invoices.push(inv); state.currentInvoice = []; renderCurrentInvoice(); renderInvoicesLog(); }
      function renderInvoicesLog(){ const tbody=qs('invoicesLog').querySelector('tbody'); tbody.innerHTML=''; state.invoices.forEach((inv,i)=>{const tr=el('tr'); tr.innerHTML=`<td>${inv.number}</td><td>${inv.client}</td><td>${inv.total}</td><td>${inv.date}</td>`; tbody.appendChild(tr)}); updateSummary(); }

      // مخزون
      function addStock(name,qty,unit){ if(!name) return alert('أدخل اسم الصنف'); state.stock.push({name:name.trim(),qty:Number(qty)||0,unit:unit||''}); renderStock(); }
      function renderStock(){ const tbody=qs('stockTable').querySelector('tbody'); tbody.innerHTML=''; state.stock.forEach((s,i)=>{const tr=el('tr'); tr.innerHTML=`<td>${s.name}</td><td>${s.qty}</td><td>${s.unit}</td><td><button data-i="${i}" class="btn ghost small delStock">حذف</button></td>`; tbody.appendChild(tr)}); updateSummary(); }

      // تقارير
      function generateReport(){ const totalSales = state.invoices.reduce((sum,i)=>sum + Number(i.total),0); const totalAppointments = state.appointments.length; const totalEmployees = state.employees.length; const totalClients = state.clients.length; const html = `<div class="small">إجمالي مبيعات الجلسة: ${totalSales}<br>عدد المواعيد: ${totalAppointments}<br>عدد الموظفين: ${totalEmployees}<br>عدد العملاء: ${totalClients}<br>عدد الفواتير: ${state.invoices.length}</div>`; qs('reportSummary').innerHTML = html; }

      // تسويق
      function previewMarketing(text){ if(!text||!text.trim()) return alert('ادخل نص الرسالة'); const list = state.clients.map(c=>c.name).join(', '); qs('marketingPreview').innerHTML = `<div class="small">نُشِر إلى: ${list || 'لا يوجد عملاء'}<br>النص: ${text}</div>`; }

      // صلاحيات
      function addRole(name){ if(!name||!name.trim()) return alert('ادخل اسم الدور'); state.roles.push({name:name.trim()}); renderRoles(); }
      function renderRoles(){ const tbody=qs('rolesTable').querySelector('tbody'); tbody.innerHTML=''; state.roles.forEach((r,i)=>{const tr=el('tr'); tr.innerHTML=`<td>${r.name}</td><td><button data-i="${i}" class="btn ghost small delRole">حذف</button></td>`; tbody.appendChild(tr)}); updateSummary(); }

      // تحديث الملخص
      function updateSummary(){ qs('summaryCount').textContent = `العملاء: ${state.clients.length} • موظفين: ${state.employees.length} • خدمات: ${state.services.length}`; qs('todayAppointmentsCount').textContent = state.appointments.filter(a=> new Date(a.datetime).toDateString()=== new Date().toDateString()).length; qs('openInvoicesCount').textContent = state.currentInvoice.length; }

      // إعادة تعيين الجلسة (تفريغ الذاكرة)
      function resetSession(){ if(!confirm('هل تريد إعادة تعيين الجلسة (سيُحذف كل شيء داخل الجلسة)؟')) return; Object.keys(state).forEach(k=>{ if(Array.isArray(state[k])) state[k]=[]; else if(typeof state[k]==='number') state[k]=1; }); state.invoiceCounter=1; renderAll(); }

      function renderAll(){ renderClients(); renderEmployees(); renderServices(); renderAppointments(); renderPayrolls(); renderCurrentInvoice(); renderInvoicesLog(); renderStock(); renderRoles(); generateReport(); }

      /* ====== event bindings ====== */
      function bindEvents(){
        // quick action buttons
        document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',e=>{
          const a=b.dataset.action; if(a.startsWith('open:addClient')){ const name = prompt('اسم الزبون'); if(name) { addClient(name); alert('تم إضافة الزبون — سيظهر في القوائم داخل الجلسة')} }
          if(a.startsWith('open:addEmployee')){ const name = prompt('اسم الموظف'); if(name){ const role = prompt('المسمى (اختياري)'); const sal = prompt('الراتب الشهري (اختياري)'); addEmployee(name,role,sal);} }
          if(a.startsWith('open:addService')){ const name = prompt('اسم الخدمة'); if(name){ const dur = prompt('المدة بالدقائق',30); const price = prompt('السعر',0); addService(name,dur,price);} }
        }));

        // sidebar build and navigate
        buildNav();
        document.querySelectorAll('.nav button')[0].addEventListener('click',()=>showSection('dashboard'));

        // employees
        qs('addEmployeeBtn').addEventListener('click',()=>{ addEmployee(qs('empName').value, qs('empRole').value, qs('empSalary').value); qs('empName').value=''; qs('empRole').value=''; qs('empSalary').value=''; });
        qs('empTable').addEventListener('click',e=>{ if(e.target.matches('.editEmp')){ const i=e.target.dataset.i; if(confirm('حذف الموظف؟')){ state.employees.splice(i,1); renderEmployees(); } } });

        // services
        qs('addServiceBtn').addEventListener('click',()=>{ addService(qs('serviceName').value, qs('serviceDuration').value, qs('servicePrice').value); qs('serviceName').value=''; qs('serviceDuration').value=30; qs('servicePrice').value=0; });
        qs('serviceTable').addEventListener('click',e=>{ if(e.target.matches('.editSrv')){ const i=e.target.dataset.i; if(confirm('حذف الخدمة؟')){ state.services.splice(i,1); renderServices(); } } });

        // appointments
        qs('addAppt').addEventListener('click',()=>{ addAppointment(qs('apptClient').value, qs('apptEmployee').value, qs('apptService').value, qs('apptDatetime').value); qs('apptDatetime').value=''; });
        qs('apptTable').addEventListener('click',e=>{ if(e.target.matches('.finishAppt')){ const i=e.target.dataset.i; state.appointments[i].status='مكتمل'; renderAppointments(); } if(e.target.matches('.delAppt')){ const i=e.target.dataset.i; if(confirm('حذف الموعد؟')){ state.appointments.splice(i,1); renderAppointments(); } } });

        // payroll
        qs('issuePay').addEventListener('click',()=>{ issuePayroll(qs('payEmployee').value, qs('payMonth').value, qs('payDeduction').value, qs('payBonus').value); qs('payDeduction').value=0; qs('payBonus').value=0; });

        // cashier
        qs('addToInvoice').addEventListener('click',()=>{ addToCurrentInvoice(qs('invoiceService').value, qs('invoiceQty').value); qs('invoiceQty').value=1; });
        qs('invoiceTable').addEventListener('click',e=>{ if(e.target.matches('.delInvItem')){ const i=e.target.dataset.i; state.currentInvoice.splice(i,1); renderCurrentInvoice(); } });
        qs('createInvoice').addEventListener('click',()=>{ finalizeInvoice(qs('invoiceClient').value); });

        // stock
        qs('addStockBtn').addEventListener('click',()=>{ addStock(qs('stockName').value, qs('stockQty').value, qs('stockUnit').value); qs('stockName').value=''; qs('stockQty').value=1; qs('stockUnit').value=''; });
        qs('stockTable').addEventListener('click',e=>{ if(e.target.matches('.delStock')){ const i=e.target.dataset.i; if(confirm('حذف الصنف؟')){ state.stock.splice(i,1); renderStock(); } } });

        // reports
        qs('generateReport').addEventListener('click',generateReport);

        // marketing
        qs('sendMarketing').addEventListener('click',()=>previewMarketing(qs('marketingText').value));

        // security roles
        qs('addRoleBtn').addEventListener('click',()=>{ addRole(qs('roleName').value); qs('roleName').value=''; });
        qs('rolesTable').addEventListener('click',e=>{ if(e.target.matches('.delRole')){ const i=e.target.dataset.i; if(confirm('حذف الدور؟')){ state.roles.splice(i,1); renderRoles(); } } });

        // invoices log updates when clicking row? Not required

        // reset session
        qs('resetSession').addEventListener('click',resetSession);

        // quick nav activation for mobile
        document.querySelectorAll('.nav button').forEach(b=>b.addEventListener('click',()=>{ document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); }));

        // table delegation: generic deletion from various tables handled above
      }

      /* ====== Initialization ====== */
      function init(){ bindEvents(); renderAll(); refreshAllSelects(); showSection('dashboard');
        // small demo data to make system feel alive (you can remove if undesired)
        addClient('زبون تجريبي'); addEmployee('أحمد','مصفف',300); addService('قص وتصفيف',45,50);
      }

      // Expose limited API for debugging
      return {state,init,addClient,addEmployee,addService,resetSession};
    })();

    // تشغيل النظام
    document.addEventListener('DOMContentLoaded',()=>{ window.hrSystem.init(); });