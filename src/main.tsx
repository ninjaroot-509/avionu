import { createRoot } from "react-dom/client";
import "@/src/styles/globals.css";
import { FlightArcadePage } from "@/src/screens/FlightArcadePage";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element #root is missing.");
}

createRoot(root).render(<FlightArcadePage />);
