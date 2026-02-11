import { useState } from "react";
import TabBtn from "./ui/TabBtn";

export default function App() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 whitespace-normal wrap-anywhere [word-break:normal]">
      <aside
        className={`fixed right-0 top-1/2 h-1/2 w-[350px] -translate-y-1/2 bg-blue-500 rounded-l-lg shadow-2xl border border-gray-200 pointer-events-auto transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 h-full overflow-auto">
          <h1 className="text-2xl font-bold mb-4 text-gray-800">Sidebar Content</h1>
          <p className="text-gray-600 whitespace-normal wrap-break-word leading-relaxed">
            This is your sidebar content. Add whatever you need here!
          </p>
        </div>
      </aside>

      <TabBtn isOpen={isOpen} setIsOpen={setIsOpen} />
    </div>
  );
}
