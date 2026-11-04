import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import './styles/tokens.css'
import './styles/lab.css'
import Home from './pages/Home'
import Gallery from './pages/Gallery'
import { InkDefs } from './components/Icon'
const Lab = lazy(() => import('./pages/Lab')), LabIcons = lazy(() => import('./pages/LabIcons'))
createRoot(document.getElementById('root')!).render(
  <StrictMode><InkDefs /><BrowserRouter><Suspense fallback={<div className="p-8 font-mono text-paper">loading lab…</div>}><Routes>
    <Route path="/" element={<Home/>}/><Route path="/gallery" element={<Gallery/>}/>
    <Route path="/lab" element={<Lab/>}/><Route path="/lab/icons" element={<LabIcons/>}/>
    <Route path="*" element={<Home/>}/></Routes></Suspense></BrowserRouter></StrictMode>)
