import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import RoleGuard from './components/RoleGuard';

import HomePage from './pages/Public/HomePage';
import ArticleDetailPage from './pages/Public/ArticleDetailPage';
import NewsPage from './pages/Public/NewsPage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import DashboardPage from './pages/Journalist/DashboardPage';
import NewArticlePage from './pages/Journalist/NewArticlePage';
import EditArticlePage from './pages/Journalist/EditArticlePage';
import QueuePage from './pages/Editor/QueuePage';
import ReviewPage from './pages/Editor/ReviewPage';
import PublishedArticlesPage from './pages/Editor/PublishedArticlesPage';
import UsersPage from './pages/Admin/UsersPage';
import CategoriesPage from './pages/Admin/CategoriesPage';
import DistrictsPage from './pages/Admin/DistrictsPage';
import ScraperPage from './pages/Admin/ScraperPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/article/:id" element={<ArticleDetailPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/journalist" element={<RoleGuard roles={['journalist', 'editor', 'super_admin']}><DashboardPage /></RoleGuard>} />
            <Route path="/journalist/new" element={<RoleGuard roles={['journalist', 'editor', 'super_admin']}><NewArticlePage /></RoleGuard>} />
            <Route path="/journalist/edit/:id" element={<RoleGuard roles={['journalist', 'editor', 'super_admin']}><EditArticlePage /></RoleGuard>} />

            <Route path="/editor" element={<RoleGuard roles={['editor', 'super_admin']}><QueuePage /></RoleGuard>} />
            <Route path="/editor/review/:id" element={<RoleGuard roles={['editor', 'super_admin']}><ReviewPage /></RoleGuard>} />
            <Route path="/editor/articles" element={<RoleGuard roles={['editor', 'super_admin', 'administrator']}><PublishedArticlesPage /></RoleGuard>} />

            <Route path="/admin" element={<RoleGuard roles={['administrator', 'super_admin']}><UsersPage /></RoleGuard>} />
            <Route path="/admin/categories" element={<RoleGuard roles={['administrator', 'super_admin']}><CategoriesPage /></RoleGuard>} />
            <Route path="/admin/districts" element={<RoleGuard roles={['administrator', 'super_admin']}><DistrictsPage /></RoleGuard>} />
            <Route path="/admin/scraper" element={<RoleGuard roles={['administrator', 'super_admin']}><ScraperPage /></RoleGuard>} />

            <Route path="*" element={<div className="container error"><h2>404 - Page not found</h2></div>} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
