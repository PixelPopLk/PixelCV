const state = {
  step: 1,
  template: 'modern',
  color: '#2563EB',
  borderStyle: 'soft',
  borderColor: '#DCE3EF',
  photoStyle: 'circle',
  font: 'Inter',
  photoData: '',
  fullName: '', age: '', title: '', email: '', phone: '', location: '', address: '', linkedin: '', website: '',
  dob: '', nationality: 'Sri Lankan', gender: '', civilStatus: '', nic: '',
  aboutMeInput: '', summary: '',
  education: [], al: [], ol: [], includeAL: false, includeOL: false,
  skills: [], experience: [],
  other: {}
};

const defaultEducation = () => ({ degree: '', institution: '', year: '', details: '' });
const defaultExperience = () => ({ title: '', company: '', dates: '', description: '' });
const defaultExam = () => ({ subject: '', grade: '' });
const gradeOptions = ['A','B','C','S','W'];
const otherDefaults = {
  projects: { title: 'Project', content: '' },
  certifications: { title: 'Certification', content: '' },
  languages: { title: 'Language', content: '' },
  achievements: { title: 'Achievement', content: '' },
  references: { title: 'Reference', content: '' },
  interests: { title: 'Interest', content: '' }
};

const $ = (id) => document.getElementById(id);

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2300);
}

function bindInput(id, key, transform = (v) => v) {
  const el = $(id);
  el.addEventListener('input', () => {
    state[key] = transform(el.value);
    saveState();
    render();
  });
}

function bindSelect(id, key) {
  $(id).addEventListener('change', () => {
    state[key] = $(id).value;
    saveState();
    render();
  });
}

function saveState() {
  const copy = structuredClone(state);
  delete copy.photoData;
  localStorage.setItem('lankaCvMaker', JSON.stringify(copy));
  $('saveState').textContent = 'Saved on this device';
}

function loadState() {
  try {
    const raw = localStorage.getItem('lankaCvMaker');
    if (!raw) return;
    const saved = JSON.parse(raw);
    Object.assign(state, saved);
  } catch {}
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
}

function nl2br(value) { return escapeHtml(value).replace(/\n/g, '<br>'); }

function syncFormFromState() {
  const map = ['fullName','age','title','email','phone','location','address','linkedin','website','dob','nationality','gender','civilStatus','nic','aboutMeInput','summary'];
  map.forEach((id) => { if ($(id)) $(id).value = state[id] ?? ''; });
  $('includeAL').checked = !!state.includeAL;
  $('includeOL').checked = !!state.includeOL;
  $('borderStyle').value = state.borderStyle;
  $('borderColor').value = state.borderColor;
  $('photoStyle').value = state.photoStyle;
  $('fontFamily').value = state.font;
  $('customColor').value = state.color;
  $('colorHex').textContent = state.color.toUpperCase();
  document.documentElement.style.setProperty('--brand', state.color);
}

function setStep(step) {
  state.step = step;
  document.querySelectorAll('.form-step').forEach(el => el.classList.toggle('active', Number(el.dataset.formStep) === step));
  document.querySelectorAll('.step').forEach(el => {
    const n = Number(el.dataset.step);
    el.classList.toggle('active', n === step);
    el.classList.toggle('done', n < step);
  });
  $('mobileProgress').textContent = `Step ${step} of 3`;
  $('backBtn').hidden = step === 1;
  $('nextBtn').hidden = step === 3;
  $('nextBtn').textContent = step === 2 ? 'Review CV' : 'Continue';
  $('formProgressBar').style.width = step === 2 ? `${formCompletion()}%` : '0%';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function requiredValid() {
  const required = ['fullName','age','email','phone'];
  const missing = required.filter(k => !String(state[k] || '').trim());
  if (missing.length) {
    toast('Please fill in your name, age, email and phone number.');
    const first = missing[0];
    $(first)?.focus();
    return false;
  }
  return true;
}

function formCompletion() {
  const total = 9;
  let score = 0;
  if (state.fullName) score++;
  if (state.age) score++;
  if (state.email) score++;
  if (state.phone) score++;
  if (state.title) score++;
  if (state.summary || state.aboutMeInput) score++;
  if (state.education.length) score++;
  if (state.skills.length) score++;
  if (state.experience.length || state.includeAL || state.includeOL) score++;
  return Math.min(100, Math.round(score / total * 100));
}

function examRows(type) {
  const rows = state[type];
  return rows.map((item, index) => `
    <div class="exam-row" data-type="${type}" data-index="${index}">
      <input data-field="subject" value="${escapeHtml(item.subject)}" placeholder="Subject">
      <select data-field="grade"><option value="">Grade</option>${gradeOptions.map(g => `<option ${item.grade===g?'selected':''}>${g}</option>`).join('')}</select>
      <button type="button" class="remove-row" title="Remove" ${rows.length <= (type==='al'?3:9) ? 'disabled' : ''}>×</button>
    </div>`).join('');
}

function renderExamForm(type, sectionId, listId) {
  $(sectionId).classList.toggle('hidden', !state[`include${type.toUpperCase()}`]);
  $(listId).innerHTML = examRows(type);
  $(listId).querySelectorAll('.exam-row').forEach(row => {
    row.querySelectorAll('[data-field]').forEach(input => {
      input.addEventListener('input', () => {
        const idx = Number(row.dataset.index);
        state[type][idx][input.dataset.field] = input.value;
        saveState(); renderPreview();
      });
    });
    row.querySelector('.remove-row').addEventListener('click', () => {
      const idx = Number(row.dataset.index);
      state[type].splice(idx, 1);
      saveState(); renderExamForm(type, sectionId, listId); renderPreview();
    });
  });
}

function renderCollections() {
  $('educationList').innerHTML = state.education.map((item, idx) => `
    <div class="education-card">
      <div class="card-top"><strong>Education ${idx + 1}</strong><button class="remove-row" type="button" data-remove-edu="${idx}">×</button></div>
      <div class="inline-fields">
        <input data-edu="degree" data-index="${idx}" value="${escapeHtml(item.degree)}" placeholder="Qualification / course">
        <input data-edu="institution" data-index="${idx}" value="${escapeHtml(item.institution)}" placeholder="School / institute">
        <input data-edu="year" data-index="${idx}" value="${escapeHtml(item.year)}" placeholder="Year / duration">
        <input data-edu="details" data-index="${idx}" value="${escapeHtml(item.details)}" placeholder="Optional details">
      </div>
    </div>`).join('');

  document.querySelectorAll('[data-remove-edu]').forEach(btn => btn.addEventListener('click', () => {
    state.education.splice(Number(btn.dataset.removeEdu),1); saveState(); renderCollections(); renderPreview();
  }));
  document.querySelectorAll('[data-edu]').forEach(input => input.addEventListener('input', () => {
    const idx = Number(input.dataset.index); state.education[idx][input.dataset.edu] = input.value; saveState(); renderPreview();
  }));

  $('experienceList').innerHTML = state.experience.map((item, idx) => `
    <div class="experience-card">
      <div class="card-top"><strong>Experience ${idx + 1}</strong><button class="remove-row" type="button" data-remove-exp="${idx}">×</button></div>
      <div class="inline-fields">
        <input data-exp="title" data-index="${idx}" value="${escapeHtml(item.title)}" placeholder="Job title">
        <input data-exp="company" data-index="${idx}" value="${escapeHtml(item.company)}" placeholder="Company">
        <input data-exp="dates" data-index="${idx}" value="${escapeHtml(item.dates)}" placeholder="Dates e.g. 2024 – 2025">
        <textarea data-exp="description" data-index="${idx}" rows="3" placeholder="What did you do?">${escapeHtml(item.description)}</textarea>
      </div>
      <div class="ai-row"><button type="button" class="btn ai-btn" data-polish-exp="${idx}">Improve with AI</button><span class="exp-status" id="expStatus${idx}"></span></div>
    </div>`).join('');

  document.querySelectorAll('[data-remove-exp]').forEach(btn => btn.addEventListener('click', () => {
    state.experience.splice(Number(btn.dataset.removeExp),1); saveState(); renderCollections(); renderPreview();
  }));
  document.querySelectorAll('[data-exp]').forEach(input => input.addEventListener('input', () => {
    const idx = Number(input.dataset.index); state.experience[idx][input.dataset.exp] = input.value; saveState(); renderPreview();
  }));
  document.querySelectorAll('[data-polish-exp]').forEach(btn => btn.addEventListener('click', () => polishExperience(Number(btn.dataset.polishExp))));

  renderOtherSections();
}

function renderOtherSections() {
  $('otherSections').innerHTML = Object.entries(state.other).map(([key, data]) => `
    <div class="other-card">
      <div class="card-top"><strong>${escapeHtml(otherDefaults[key]?.title || key)}</strong><button class="remove-row" type="button" data-remove-other="${key}">×</button></div>
      <textarea rows="3" data-other="${key}" placeholder="Add details...">${escapeHtml(data.content)}</textarea>
    </div>`).join('');
  document.querySelectorAll('[data-remove-other]').forEach(btn => btn.addEventListener('click', () => {
    delete state.other[btn.dataset.removeOther]; saveState(); renderOtherSections(); renderPreview();
  }));
  document.querySelectorAll('[data-other]').forEach(el => el.addEventListener('input', () => {
    state.other[el.dataset.other].content = el.value; saveState(); renderPreview();
  }));
}

function addOtherSection(key) {
  if (!state.other[key]) state.other[key] = { ...otherDefaults[key] };
  renderOtherSections(); renderPreview(); saveState();
}

function buildGradeChart(rows) {
  const valid = rows.filter(r => r.subject.trim() && r.grade);
  if (!valid.length) return '';
  const counts = {A:0,B:0,C:0,S:0,W:0};
  valid.forEach(r => counts[r.grade] = (counts[r.grade] || 0) + 1);
  const total = valid.length;
  return Object.entries(counts).filter(([,count]) => count).map(([grade,count]) => `
    <div class="grade-chart-row"><span>Grade ${grade}</span><div class="bar"><span style="width:${Math.round(count/total*100)}%"></span></div><b>${count}</b></div>`).join('');
}

function renderExamPreview(type, tableId, chartId) {
  const rows = state[type].filter(r => r.subject.trim() || r.grade);
  $(tableId).innerHTML = rows.length ? `<div class="grade-table">${rows.map(r => `<div>${escapeHtml(r.subject || '—')}</div><div class="grade-badge">${escapeHtml(r.grade || '—')}</div>`).join('')}</div>` : '';
  $(chartId).innerHTML = buildGradeChart(rows);
}

function renderPreview() {
  const paper = $('cvPaper');
  paper.className = `cv-paper template-${state.template}`;
  paper.style.setProperty('--brand', state.color);
  paper.style.setProperty('--border-color', state.borderColor);
  paper.style.setProperty('--cv-font', state.font);
  paper.style.borderStyle = state.borderStyle === 'solid' ? 'solid' : state.borderStyle === 'soft' ? 'solid' : 'none';
  paper.style.borderWidth = state.borderStyle === 'soft' ? '3px' : state.borderStyle === 'solid' ? '1px' : '0';
  $('previewTitle').textContent = `${state.template[0].toUpperCase()+state.template.slice(1)} CV`;
  $('cvName').textContent = state.fullName || 'YOUR NAME';
  $('cvTitle').textContent = state.title || 'Professional Title';
  $('cvSummary').innerHTML = nl2br(state.summary || state.aboutMeInput || '');
  $('summarySection').hidden = !(state.summary || state.aboutMeInput);

  const contact = [];
  if (state.phone) contact.push(`<div class="cv-contact-item"><b>☎</b><span>${escapeHtml(state.phone)}</span></div>`);
  if (state.email) contact.push(`<div class="cv-contact-item"><b>✉</b><span>${escapeHtml(state.email)}</span></div>`);
  if (state.location) contact.push(`<div class="cv-contact-item"><b>⌖</b><span>${escapeHtml(state.location)}</span></div>`);
  if (state.website) contact.push(`<div class="cv-contact-item"><b>↗</b><span>${escapeHtml(state.website)}</span></div>`);
  if (state.linkedin) contact.push(`<div class="cv-contact-item"><b>in</b><span>${escapeHtml(state.linkedin)}</span></div>`);
  if (state.age) contact.push(`<div class="cv-contact-item"><b>Age</b><span>${escapeHtml(state.age)}</span></div>`);
  $('cvContact').innerHTML = contact.join('');
  $('contactBlock').hidden = contact.length === 0;

  $('skillsBlock').hidden = !state.skills.length;
  $('cvSkills').innerHTML = state.skills.map(skill => `<div class="skill-side"><div class="label">${escapeHtml(skill)}</div><div class="skill-bar"><span style="width:78%"></span></div></div>`).join('');

  if (state.photoData) {
    $('cvPhoto').src = state.photoData; $('cvPhotoWrap').hidden = false;
  } else {
    $('cvPhotoWrap').hidden = true;
  }
  $('cvPhotoWrap').className = `cv-photo ${state.photoStyle}`;

  $('experienceSection').hidden = !state.experience.some(x => x.title || x.company || x.description);
  $('cvExperience').innerHTML = state.experience.filter(x => x.title || x.company || x.description).map(x => `
    <div class="cv-entry"><div class="entry-grid"><div class="entry-meta"><b>${escapeHtml(x.company || '')}</b>${escapeHtml(x.dates || '')}</div><div class="entry-main"><b>${escapeHtml(x.title || '')}</b>${x.description ? `<p>${nl2br(x.description)}</p>` : ''}</div></div></div>`).join('');

  $('educationSection').hidden = !state.education.some(x => x.degree || x.institution || x.details);
  $('cvEducation').innerHTML = state.education.filter(x => x.degree || x.institution || x.details).map(x => `
    <div class="cv-entry"><div class="entry-grid"><div class="entry-meta"><b>${escapeHtml(x.institution || '')}</b>${escapeHtml(x.year || '')}</div><div class="entry-main"><b>${escapeHtml(x.degree || '')}</b>${x.details ? `<p>${nl2br(x.details)}</p>` : ''}</div></div></div>`).join('');

  $('alCvSection').hidden = !state.includeAL;
  $('olCvSection').hidden = !state.includeOL;
  renderExamPreview('al','cvAL','cvALChart'); renderExamPreview('ol','cvOL','cvOLChart');

  const skillMain = state.skills.map(s => `<div class="skill-main">${escapeHtml(s)}</div>`).join('');
  if (state.template === 'classic' || state.template === 'minimal') {
    let skillsSection = $('cvPaper').querySelector('#skillsMainDynamic');
    if (!skillsSection) {
      skillsSection = document.createElement('section'); skillsSection.id='skillsMainDynamic'; skillsSection.className='cv-section'; $('cvPaper').querySelector('.cv-body').appendChild(skillsSection);
    }
    skillsSection.hidden = !state.skills.length; skillsSection.innerHTML = `<div class="cv-section-title">SKILLS</div><div class="skill-list-main">${skillMain}</div>`;
  } else if ($('skillsMainDynamic')) $('skillsMainDynamic').remove();

  renderOtherPreview('projects'); renderOtherPreview('certifications'); renderOtherPreview('achievements'); renderOtherPreview('interests');
  renderOtherSidebar('languages','cvLanguagesSide','languagesBlock');
  renderOtherSidebar('references','cvReferencesSide','refsBlockSide');

  $('formProgressBar').style.width = `${formCompletion()}%`;
}

function renderOtherPreview(key) {
  const section = $(`${key}Section`);
  const data = state.other[key]?.content?.trim() || '';
  section.hidden = !data;
  const target = $(`cv${key[0].toUpperCase()+key.slice(1)}`);
  if (!target) return;
  target.innerHTML = data.split(/\n+/).filter(Boolean).map(line => `<div class="bullet-item">${escapeHtml(line)}</div>`).join('');
}

function renderOtherSidebar(key, targetId, blockId) {
  const data = state.other[key]?.content?.trim() || '';
  $(blockId).hidden = !data;
  $(targetId).innerHTML = data.split(/\n+/).filter(Boolean).map(line => `<div class="lang-side"><span>${escapeHtml(line)}</span><span></span></div>`).join('');
  if (key === 'languages') $('languagesBlock').hidden = !data;
}

function render() {
  syncFormFromState();
  renderCollections();
  renderExamForm('al','alSection','alList');
  renderExamForm('ol','olSection','olList');
  renderPreview();
}

async function apiAI(action, input) {
  const response = await fetch('/api/ai', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({action,input}) });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || 'AI request failed');
  return data.result;
}

async function generateSummary() {
  const raw = $('aboutMeInput').value.trim();
  if (!raw) { toast('Write a few lines about yourself first.'); $('aboutMeInput').focus(); return; }
  $('summaryStatus').textContent = 'Writing...';
  $('generateSummaryBtn').disabled = true;
  try {
    const result = await apiAI('summary', {
      name: state.fullName, title: state.title, education: state.education.map(e=>`${e.degree} — ${e.institution} (${e.year})`).join('; '),
      experience: state.experience.map(e=>`${e.title} at ${e.company}: ${e.description}`).join('\n'), skills: state.skills.join(', '), projects: state.other.projects?.content || '', aboutMe: raw
    });
    state.aboutMeInput = raw; state.summary = result; $('summary').value = result; saveState(); renderPreview(); $('summaryStatus').textContent = 'Done';
  } catch (error) {
    $('summaryStatus').textContent = 'AI unavailable'; toast(error.message || 'AI request failed.');
  } finally { $('generateSummaryBtn').disabled = false; setTimeout(() => $('summaryStatus').textContent='', 1800); }
}

async function polishExperience(index) {
  const item = state.experience[index];
  if (!item?.description?.trim()) { toast('Write what you did first.'); return; }
  const status = $(`expStatus${index}`); status.textContent='Writing...';
  const button = document.querySelector(`[data-polish-exp="${index}"]`); if (button) button.disabled=true;
  try {
    const result = await apiAI('experience', item);
    item.description = result; saveState(); renderCollections(); renderPreview(); toast('Experience updated.');
  } catch (error) { toast(error.message || 'AI request failed.'); }
  finally { if (button) button.disabled=false; if(status) status.textContent=''; }
}

function setup() {
  loadState();
  bindInput('fullName','fullName'); bindInput('age','age'); bindInput('title','title'); bindInput('email','email'); bindInput('phone','phone'); bindInput('location','location'); bindInput('address','address'); bindInput('linkedin','linkedin'); bindInput('website','website'); bindInput('dob','dob'); bindInput('nationality','nationality'); bindSelect('gender','gender'); bindSelect('civilStatus','civilStatus'); bindInput('nic','nic'); bindInput('aboutMeInput','aboutMeInput'); bindInput('summary','summary');
  $('summary').addEventListener('input', () => { state.summary = $('summary').value; saveState(); renderPreview(); });

  document.querySelectorAll('.template-card').forEach(btn => btn.addEventListener('click', () => { state.template=btn.dataset.template; saveState(); document.querySelectorAll('.template-card').forEach(b=>b.classList.toggle('selected', b===btn)); renderPreview(); }));
  document.querySelectorAll('.color-dot').forEach(btn => btn.addEventListener('click', () => { state.color=btn.dataset.color; saveState(); syncFormFromState(); renderPreview(); document.querySelectorAll('.color-dot').forEach(b=>b.classList.toggle('active', b===btn)); }));
  $('customColor').addEventListener('input', () => { state.color=$('customColor').value; saveState(); document.querySelectorAll('.color-dot').forEach(b=>b.classList.remove('active')); renderPreview(); $('colorHex').textContent=state.color.toUpperCase(); document.documentElement.style.setProperty('--brand',state.color); });
  bindSelect('borderStyle','borderStyle'); bindSelect('photoStyle','photoStyle'); bindSelect('fontFamily','font'); bindInput('borderColor','borderColor');
  $('photoInput').addEventListener('change', () => { const file=$('photoInput').files?.[0]; if (!file) return; const reader=new FileReader(); reader.onload=()=>{state.photoData=reader.result; $('avatarPreview').innerHTML=`<img src="${state.photoData}" alt="">`; renderPreview();}; reader.readAsDataURL(file); });

  $('addEducationBtn').addEventListener('click', () => { state.education.push(defaultEducation()); saveState(); renderCollections(); renderPreview(); });
  $('addExperienceBtn').addEventListener('click', () => { state.experience.push(defaultExperience()); saveState(); renderCollections(); renderPreview(); });
  $('addALBtn').addEventListener('click', () => { state.al.push(defaultExam()); saveState(); renderExamForm('al','alSection','alList'); renderPreview(); });
  $('addOLBtn').addEventListener('click', () => { state.ol.push(defaultExam()); saveState(); renderExamForm('ol','olSection','olList'); renderPreview(); });
  $('includeAL').addEventListener('change', () => { state.includeAL=$('includeAL').checked; if(state.includeAL && state.al.length<3) while(state.al.length<3) state.al.push(defaultExam()); saveState(); renderExamForm('al','alSection','alList'); renderPreview(); });
  $('includeOL').addEventListener('change', () => { state.includeOL=$('includeOL').checked; if(state.includeOL && state.ol.length<9) while(state.ol.length<9) state.ol.push(defaultExam()); saveState(); renderExamForm('ol','olSection','olList'); renderPreview(); });
  document.querySelectorAll('[data-add-section]').forEach(btn=>btn.addEventListener('click',()=>addOtherSection(btn.dataset.addSection)));
  $('skillInput').addEventListener('keydown', e => { if(e.key==='Enter'){e.preventDefault(); const value=e.target.value.trim(); if(value && !state.skills.includes(value)){state.skills.push(value);e.target.value='';saveState();renderPreview();renderSkillTags();}} });
  $('generateSummaryBtn').addEventListener('click', generateSummary);
  $('nextBtn').addEventListener('click',()=>{ if(state.step===1) setStep(2); else if(state.step===2 && requiredValid()) setStep(3); });
  $('backBtn').addEventListener('click',()=>setStep(Math.max(1,state.step-1)));
  $('backToDetailsBtn').addEventListener('click',()=>setStep(2));
  $('downloadBtn').addEventListener('click',downloadPDF);

  renderSkillTags();
  render();
  document.querySelectorAll('.template-card').forEach(b=>b.classList.toggle('selected',b.dataset.template===state.template));
  setStep(state.step || 1);
}

function renderSkillTags(){ $('skillTags').innerHTML=state.skills.map((skill,i)=>`<span class="tag">${escapeHtml(skill)} <button type="button" data-remove-skill="${i}">×</button></span>`).join(''); document.querySelectorAll('[data-remove-skill]').forEach(btn=>btn.addEventListener('click',()=>{state.skills.splice(Number(btn.dataset.removeSkill),1);saveState();renderSkillTags();renderPreview();})); }

async function downloadPDF(){
  if (!requiredValid()) return;
  renderPreview();
  const paper=$('cvPaper');
  if (!window.html2pdf) { window.print(); return; }
  toast('Preparing your PDF...');
  const old = paper.style.transform; paper.style.transform='none';
  const opt={margin:0,filename:`${(state.fullName||'CV').replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'') || 'CV'}.pdf`,image:{type:'jpeg',quality:.98},html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}};
  try { await window.html2pdf().set(opt).from(paper).save(); }
  catch (error) { console.error(error); toast('PDF export failed. Use the Print option from your browser.'); }
  finally { paper.style.transform=old; }
}

setup();
