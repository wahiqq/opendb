import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import SearchDashboard from './pages/SearchDashboard'
import ToolSuite from './pages/ToolSuite'
import DeleteListGenerator from './pages/DeleteListGenerator'
import DuplicateFinder from './pages/DuplicateFinder'
import OverlapChecker from './pages/OverlapChecker'
import CompanyPage from './pages/CompanyPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<SearchDashboard />} />
        <Route path="/company/:companyId" element={<CompanyPage />} />
        <Route path="/tool-suite" element={<ToolSuite />} />
        <Route path="/delete-list" element={<DeleteListGenerator />} />
        <Route path="/duplicate-finder" element={<DuplicateFinder />} />
        <Route path="/overlap-checker" element={<OverlapChecker />} />
      </Routes>
    </BrowserRouter>
  )
}
