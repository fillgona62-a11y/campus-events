import { RouterProvider } from 'react-router-dom';
import router from './router';

/** 应用路由出口 */
export default function App() {
  return <RouterProvider router={router} />;
}
