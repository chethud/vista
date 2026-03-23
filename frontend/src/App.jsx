import { Route, Routes } from "react-router-dom";
import Multilingo from "./pages/Multilingo";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Multilingo />} />
      <Route path="/translate" element={<Multilingo />} />
    </Routes>
  );
}
