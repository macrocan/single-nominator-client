/* eslint-disable react-refresh/only-export-components */
import App from "App";
import { Routes } from "config";
import ChangeValidatorPage from "pages/change-validator";
import DeploySingleNominatorPage from "pages/deploy-single-nominator";
import HomePage from "pages/home";
import TransferPage from "pages/transfer";
import WithdrawPage from "pages/withdraw";
import { createBrowserRouter } from "react-router-dom";

export const router = createBrowserRouter([
  {
    path: Routes.root,
    element: <App />,
    children: [
      {
        element: <HomePage />,
        index: true,
      },
      {
        path: Routes.deposit,
        element: (
          <TransferPage />
        ),
      },
      {
        path: Routes.withdraw,
        element: (
          <WithdrawPage />
        ),
      },
      {
        path: Routes.changeValidator,
        element: (
          <ChangeValidatorPage />
        ),
      },
      {
        path: Routes.deploySingleNominator,
        element: (
          <DeploySingleNominatorPage />
        ),
      },
    ],
  },
], {
  basename: import.meta.env.VITE_BASE_URL ?? '/single-nominator-client'
});
