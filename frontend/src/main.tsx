import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import ContextApiProvider from "./context/ContextApi.tsx";
import { QueryClient, QueryClientProvider } from "react-query";
const queryClient = new QueryClient();
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ContextApiProvider>
          <App />
        </ContextApiProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
