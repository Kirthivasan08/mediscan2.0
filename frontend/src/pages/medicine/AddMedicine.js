import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, API } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './AddMedicine.css';

const CATS     = ['other','analgesic','antibiotic','antiviral','antifungal','cardiovascular','diabetes','neurological','respiratory','gastrointestinal','vitamin','supplement','dermatology','ophthalmology','surgery','emergency'];
const FORMS    = ['tablet','capsule','syrup','injection','cream','ointment','drops','inhaler','patch','suppository','powder','gel','oral','other'];
const SEVS     = ['mild','moderate','severe'];
const BLOOD    = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

const blank = {
  name:'',genericName:'',brand:'',manufacturer:'',batchNumber:'',barcode:'',
  category:'other',dosageForm:'tablet',strength:'',description:'',
  uses:[],contraindications:[],warnings:[],precautions:[],sideEffects:[],
  interactions:[],composition:[],
  dosageInstructions:{ adults:'',children:'',elderly:'',frequency:'',maxDailyDose:'',duration:'',consumption:'Oral',withFood:false },
  storage:{ temperature:'',conditions:'',light:'' },
  manufacturingDate:'',expiryDate:'',price:'',mrp:'',
  prescriptionRequired:false,isGeneric:false,
};

export default function AddMedicine() {
  const { id }      = useParams();
  const isEdit      = Boolean(id);
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [form, setForm]     = useState(blank);
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState('basic');

  // new item states
  const [newUse,  setNewUse]  = useState('');
  const [newWarn, setNewWarn] = useState('');
  const [newContra, setNewContra] = useState('');
  const [newPrec, setNewPrec] = useState('');
  const [newSE,   setNewSE]   = useState({ severity:'mild', description:'' });
  const [newInter,setNewInter]= useState({ medicine:'',description:'',severity:'moderate' });
  const [newComp, setNewComp] = useState({ ingredient:'',amount:'' });

  useEffect(() => {
    if (!isEdit) return;
    API.get(`/medicines/${id}`).then(({ data }) => {
      const m = data.medicine;
      setForm({
        ...blank, ...m,
        manufacturingDate: m.manufacturingDate ? m.manufacturingDate.split('T')[0] : '',
        expiryDate:        m.expiryDate        ? m.expiryDate.split('T')[0]        : '',
        uses:              m.uses            || [],
        contraindications: m.contraindications|| [],
        warnings:          m.warnings        || [],
        precautions:       m.precautions     || [],
        sideEffects:       m.sideEffects     || [],
        interactions:      m.interactions    || [],
        composition:       m.composition     || [],
        dosageInstructions: { ...blank.dosageInstructions, ...m.dosageInstructions },
        storage:           { ...blank.storage, ...m.storage },
      });
    }).catch(() => toast.error('Failed to load medicine'));
  }, [id, isEdit]);

  if (!user || (user.role !== 'admin' && user.role !== 'pharmacist' && user.role !== 'doctor')) {
    return <div className="page text-center"><h2>Access Denied</h2><p className="text-muted mt-2">Only admins, pharmacists, and doctors can add medicines.</p></div>;
  }

  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  const setNested = (p,k,v) => setForm(f => ({...f,[p]:{...f[p],[k]:v}}));
  const addItem   = (k,item) => setForm(f => ({...f,[k]:[...f[k],item]}));
  const removeItem = (k,i)  => setForm(f => ({...f,[k]:f[k].filter((_,j)=>j!==i)}));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Medicine name is required.');
    setLoading(true);
    try {
      if (isEdit) {
        await API.put(`/medicines/${id}`, form);
        toast.success('Medicine updated!');
        navigate(`/medicine/${id}`);
      } else {
        const { data } = await API.post('/medicines', form);
        toast.success('Medicine added & QR generated! ✅');
        navigate(`/medicine/${data.medicine._id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setLoading(false); }
  };

  const SECTIONS = ['basic','dosage','safety','storage','composition'];

  return (
    <div className="page">
      <div className="add-header animate-in">
        <h1 className="section-title">{isEdit ? '✏️ Edit Medicine' : '➕ Add New Medicine'}</h1>
        <p className="section-sub">{isEdit ? 'Update medicine details' : 'Add a medicine to the database — QR code will be auto-generated'}</p>
      </div>

      <div className="add-layout">
        {/* Section nav */}
        <nav className="section-nav animate-in">
          {SECTIONS.map(s => (
            <button key={s} className={`sec-btn ${section===s?'active':''}`} onClick={() => setSection(s)}>
              {s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </nav>

        <form onSubmit={handleSubmit} className="add-form animate-in">
          {/* BASIC */}
          {section === 'basic' && (
            <div className="form-section">
              <h2 className="fs-title">Basic Information</h2>
              <div className="fg2">
                <div className="form-group"><label className="form-label">Medicine Name *</label><input type="text" className="form-input" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Paracetamol" required /></div>
                <div className="form-group"><label className="form-label">Generic Name</label><input type="text" className="form-input" value={form.genericName} onChange={e=>set('genericName',e.target.value)} placeholder="e.g. Acetaminophen" /></div>
                <div className="form-group"><label className="form-label">Brand Name</label><input type="text" className="form-input" value={form.brand} onChange={e=>set('brand',e.target.value)} placeholder="e.g. Crocin, Dolo-650, Calpol" /></div>
                <div className="form-group"><label className="form-label">Manufacturer</label><input type="text" className="form-input" value={form.manufacturer} onChange={e=>set('manufacturer',e.target.value)} placeholder="e.g. GSK Pharmaceuticals" /></div>
                <div className="form-group"><label className="form-label">Batch Number</label><input type="text" className="form-input font-mono" value={form.batchNumber} onChange={e=>set('batchNumber',e.target.value)} placeholder="e.g. PCM-2024-001" /></div>
                <div className="form-group"><label className="form-label">Barcode</label><input type="text" className="form-input font-mono" value={form.barcode} onChange={e=>set('barcode',e.target.value)} placeholder="EAN-13" /></div>
                <div className="form-group"><label className="form-label">Category</label><select className="form-input" value={form.category} onChange={e=>set('category',e.target.value)}>{CATS.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Dosage Form</label><select className="form-input" value={form.dosageForm} onChange={e=>set('dosageForm',e.target.value)}>{FORMS.map(f=><option key={f} value={f}>{f.charAt(0).toUpperCase()+f.slice(1)}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Strength</label><input type="text" className="form-input" value={form.strength} onChange={e=>set('strength',e.target.value)} placeholder="e.g. 500mg" /></div>
                <div className="form-group"><label className="form-label">Price (INR)</label><input type="number" className="form-input" value={form.price} onChange={e=>set('price',e.target.value)} placeholder="0.00" min="0" step="0.01" /></div>
                <div className="form-group"><label className="form-label">Manufacturing Date</label><input type="date" className="form-input" value={form.manufacturingDate} onChange={e=>set('manufacturingDate',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Expiry Date</label><input type="date" className="form-input" value={form.expiryDate} onChange={e=>set('expiryDate',e.target.value)} /></div>
              </div>
              <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={3} value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Brief description of the medicine…" /></div>
              <div style={{display:'flex',gap:20}}>
                <label className="toggle-label"><input type="checkbox" checked={form.prescriptionRequired} onChange={e=>set('prescriptionRequired',e.target.checked)} /><span className="toggle-track"><span className="toggle-thumb"/></span> Prescription Required</label>
                <label className="toggle-label"><input type="checkbox" checked={form.isGeneric} onChange={e=>set('isGeneric',e.target.checked)} /><span className="toggle-track"><span className="toggle-thumb"/></span> Generic Medicine</label>
              </div>

              {/* Uses */}
              <div className="form-group mt-3">
                <label className="form-label">Uses / Indications</label>
                <div className="tag-row">{form.uses.map((u,i)=><span key={i} className="tag">{u}<button type="button" onClick={()=>removeItem('uses',i)}>×</button></span>)}</div>
                <div className="tag-input-row">
                  <input type="text" className="form-input" value={newUse} onChange={e=>setNewUse(e.target.value)} placeholder="e.g. Fever, Headache" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(newUse.trim()){addItem('uses',newUse.trim());setNewUse('')}}}} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={()=>{if(newUse.trim()){addItem('uses',newUse.trim());setNewUse('')}}}>Add</button>
                </div>
              </div>
            </div>
          )}

          {/* DOSAGE */}
          {section === 'dosage' && (
            <div className="form-section">
              <h2 className="fs-title">Dosage Instructions</h2>
              <div className="fg2">
                {['adults','children','elderly'].map(g=><div key={g} className="form-group"><label className="form-label">{g.charAt(0).toUpperCase()+g.slice(1)}</label><input type="text" className="form-input" value={form.dosageInstructions[g]} onChange={e=>setNested('dosageInstructions',g,e.target.value)} placeholder={`${g} dosage`} /></div>)}
                <div className="form-group"><label className="form-label">Frequency</label><input type="text" className="form-input" value={form.dosageInstructions.frequency} onChange={e=>setNested('dosageInstructions','frequency',e.target.value)} placeholder="e.g. 1 tablet every 6-8 hours" /></div>
                <div className="form-group"><label className="form-label">Max Daily Dose</label><input type="text" className="form-input" value={form.dosageInstructions.maxDailyDose} onChange={e=>setNested('dosageInstructions','maxDailyDose',e.target.value)} placeholder="e.g. 4000mg/day" /></div>
                <div className="form-group"><label className="form-label">Duration</label><input type="text" className="form-input" value={form.dosageInstructions.duration} onChange={e=>setNested('dosageInstructions','duration',e.target.value)} placeholder="e.g. 5-7 days" /></div>
                <div className="form-group"><label className="form-label">Consumption Route</label><input type="text" className="form-input" value={form.dosageInstructions.consumption} onChange={e=>setNested('dosageInstructions','consumption',e.target.value)} placeholder="e.g. Oral" /></div>
              </div>
              <label className="toggle-label"><input type="checkbox" checked={form.dosageInstructions.withFood} onChange={e=>setNested('dosageInstructions','withFood',e.target.checked)} /><span className="toggle-track"><span className="toggle-thumb"/></span> Take with food</label>
            </div>
          )}

          {/* SAFETY */}
          {section === 'safety' && (
            <div className="form-section">
              <h2 className="fs-title">Safety Information</h2>

              <div className="form-group">
                <label className="form-label">Side Effects</label>
                {form.sideEffects.map((se,i)=><div key={i} className="list-item-row"><span className={`badge badge-${se.severity==='severe'?'red':se.severity==='moderate'?'yellow':'green'}`}>{se.severity}</span><span style={{flex:1}}>{se.description}</span><button type="button" className="btn btn-ghost btn-sm" onClick={()=>removeItem('sideEffects',i)}>×</button></div>)}
                <div className="tag-input-row">
                  <select className="form-input" style={{maxWidth:120}} value={newSE.severity} onChange={e=>setNewSE(s=>({...s,severity:e.target.value}))}>{SEVS.map(s=><option key={s}>{s}</option>)}</select>
                  <input type="text" className="form-input" value={newSE.description} onChange={e=>setNewSE(s=>({...s,description:e.target.value}))} placeholder="Side effect description" />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={()=>{if(newSE.description.trim()){addItem('sideEffects',{...newSE});setNewSE({severity:'mild',description:''})}}}>Add</button>
                </div>
              </div>

              {[['warnings','Warnings','warn','newWarn',setNewWarn,newWarn],['contraindications','Contraindications','danger','newContra',setNewContra,newContra],['precautions','Precautions','blue','newPrec',setNewPrec,newPrec]].map(([field,label,cls,key,setter,val])=>(
                <div key={field} className="form-group">
                  <label className="form-label">{label}</label>
                  <div className="tag-row">{form[field].map((w,i)=><span key={i} className={`tag tag-${cls}`}>{w}<button type="button" onClick={()=>removeItem(field,i)}>×</button></span>)}</div>
                  <div className="tag-input-row">
                    <input type="text" className="form-input" value={val} onChange={e=>setter(e.target.value)} placeholder={`Add ${label.toLowerCase()}…`} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(val.trim()){addItem(field,val.trim());setter('')}}}} />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={()=>{if(val.trim()){addItem(field,val.trim());setter('')}}}>Add</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STORAGE */}
          {section === 'storage' && (
            <div className="form-section">
              <h2 className="fs-title">Storage & Drug Interactions</h2>
              <div className="fg2">
                <div className="form-group"><label className="form-label">Temperature</label><input type="text" className="form-input" value={form.storage.temperature} onChange={e=>setNested('storage','temperature',e.target.value)} placeholder="e.g. Store below 30°C" /></div>
                <div className="form-group"><label className="form-label">Conditions</label><input type="text" className="form-input" value={form.storage.conditions} onChange={e=>setNested('storage','conditions',e.target.value)} placeholder="e.g. Cool, dry place" /></div>
                <div className="form-group"><label className="form-label">Light</label><input type="text" className="form-input" value={form.storage.light} onChange={e=>setNested('storage','light',e.target.value)} placeholder="e.g. Keep away from sunlight" /></div>
              </div>
              <div className="form-group">
                <label className="form-label">Drug Interactions</label>
                {form.interactions.map((inter,i)=><div key={i} className="list-item-row"><strong style={{minWidth:100}}>{inter.medicine}</strong><span className={`badge badge-${inter.severity==='severe'?'red':'yellow'}`}>{inter.severity}</span><span style={{flex:1}}>{inter.description}</span><button type="button" className="btn btn-ghost btn-sm" onClick={()=>removeItem('interactions',i)}>×</button></div>)}
                <div className="tag-input-row" style={{flexWrap:'wrap'}}>
                  <input type="text" className="form-input" style={{minWidth:120}} value={newInter.medicine} onChange={e=>setNewInter(s=>({...s,medicine:e.target.value}))} placeholder="Medicine name" />
                  <select className="form-input" style={{maxWidth:130}} value={newInter.severity} onChange={e=>setNewInter(s=>({...s,severity:e.target.value}))}>{SEVS.map(s=><option key={s}>{s}</option>)}</select>
                  <input type="text" className="form-input" value={newInter.description} onChange={e=>setNewInter(s=>({...s,description:e.target.value}))} placeholder="Interaction description" />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={()=>{if(newInter.medicine.trim()){addItem('interactions',{...newInter});setNewInter({medicine:'',description:'',severity:'moderate'})}}}>Add</button>
                </div>
              </div>
            </div>
          )}

          {/* COMPOSITION */}
          {section === 'composition' && (
            <div className="form-section">
              <h2 className="fs-title">Composition</h2>
              <div className="form-group">
                <label className="form-label">Ingredients</label>
                {form.composition.map((c,i)=><div key={i} className="list-item-row"><span style={{flex:1}}>{c.ingredient}</span>{c.amount&&<span className="font-mono text-sm text-faint">{c.amount}</span>}<button type="button" className="btn btn-ghost btn-sm" onClick={()=>removeItem('composition',i)}>×</button></div>)}
                <div className="tag-input-row">
                  <input type="text" className="form-input" value={newComp.ingredient} onChange={e=>setNewComp(s=>({...s,ingredient:e.target.value}))} placeholder="Ingredient name" />
                  <input type="text" className="form-input" value={newComp.amount} onChange={e=>setNewComp(s=>({...s,amount:e.target.value}))} placeholder="Amount (e.g. 500mg)" />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={()=>{if(newComp.ingredient.trim()){addItem('composition',{...newComp});setNewComp({ingredient:'',amount:''})}}}>Add</button>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="form-footer">
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? <><div className="spinner" style={{width:16,height:16,borderWidth:2}}/>{isEdit?'Updating…':'Saving…'}</> : (isEdit ? '✓ Update Medicine' : '✨ Save & Generate QR')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
