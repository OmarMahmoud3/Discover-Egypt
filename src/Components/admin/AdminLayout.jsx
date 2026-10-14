import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { useLanguage } from '../../context/LanguageContext';
import '../../styles/admin.css';

/**
 * AdminLayout — Shell layout wrapping sidebar + main content area.
 * Child routes render into <Outlet />.
 */
export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { dir, lang } = useLanguage();

  return (
    <div dir={dir} data-lang={lang} className="admin-shell">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="admin-main">
        <Outlet context={{ onToggleSidebar: () => setSidebarOpen((prev) => !prev) }} />
      </div>
    </div>
  );
}
