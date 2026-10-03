// Standalone bundle of the same homepage, used to publish a no-install preview.
import { createRoot } from "react-dom/client";
import { Home } from "@/components/Home";

createRoot(document.getElementById("root")!).render(<Home />);
