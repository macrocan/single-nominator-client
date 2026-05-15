import React from "react";
import ReactDOM from "react-dom/client";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { MANIFAST_URL } from "consts";
import { RouterProvider } from "react-router-dom";
import { router } from "router";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import "./reset.css";
import { Theme } from "theme";
import { GlobalStyle } from "styles";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TonConnectUIProvider
      manifestUrl={MANIFAST_URL}
    >
      <Theme>
        <GlobalStyle />
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </Theme>
    </TonConnectUIProvider>
  </React.StrictMode>
);
