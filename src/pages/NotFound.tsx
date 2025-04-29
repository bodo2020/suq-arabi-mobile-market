
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import MainLayout from '@/components/layout/MainLayout';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <MainLayout>
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-xl text-gray-600 mb-3">عفواً، الصفحة غير موجودة</p>
          <p className="text-lg text-gray-500 mb-6">Sorry, the page was not found</p>
          <Link to="/" className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors">
            الرجوع للصفحة الرئيسية
          </Link>
        </div>
      </div>
    </MainLayout>
  );
};

export default NotFound;
