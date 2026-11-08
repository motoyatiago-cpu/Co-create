import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../../src/App';
import '../../src/styles/global.css';
import '../../src/styles/home.css';
import '../../src/styles/team.css';

function LifecycleFixture() {
  const [mounted, setMounted] = useState(true);
  return <><button style={{ position: 'fixed', top: 10, right: 10, zIndex: 100, background: '#f4e9d4', color: '#131a3a', padding: 10 }} onClick={() => setMounted(value => !value)}>{mounted ? '卸载测试页面' : '挂载测试页面'}</button>{mounted && <App />}</>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><LifecycleFixture /></StrictMode>);
