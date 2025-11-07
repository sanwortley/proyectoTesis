// src/layout/LayoutBase.js
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function LayoutBase({ children }) {
  const { pathname } = useLocation();
  const hide = pathname === '/' || pathname === '/registro';
  return (
    <>
      {!hide && <Navbar />}
      <main className="main-container">{children}</main>
    </>
  );
}
