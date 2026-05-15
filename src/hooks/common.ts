/* eslint-disable @typescript-eslint/no-explicit-any */
import { useTonAddress, useTonConnectUI } from "@tonconnect/ui-react";
import {  useCallback } from "react";
import { showSuccessToast } from "toasts";
import {
  Sender,
  beginCell,
  storeStateInit,
  Address,
  SenderArguments,
} from "ton-core";
import { TX_VALID_UNTIL_MS } from "consts";

export const useGetSender = () => {
  const address = useTonAddress();
  const [tonConnect] = useTonConnectUI();

  return useCallback((): Sender => {
    if (!address) {
      throw new Error("Not connected");
    }

    const init = (init: any) => {
      const result = init
        ? beginCell()
            .store(storeStateInit(init))
            .endCell()
            .toBoc({ idx: false })
            .toString("base64")
        : undefined;

      return result;
    };

    return {
      address: Address.parse(address!),
      async send(args: SenderArguments) {
        await tonConnect.sendTransaction({
          validUntil: Date.now() + TX_VALID_UNTIL_MS,
          messages: [
            {
              address: args.to.toString(),
              amount: args.value.toString(),
              stateInit: init(args.init),
              payload: args.body
                ? args.body.toBoc().toString("base64")
                : undefined,
            },
          ],
        });
      },
    };
  }, [address, tonConnect]);
};


type CopiedValue = string | null;
type CopyFn = (text: string) => Promise<boolean>; // Return success

export function useCopyToClipboard(): [CopiedValue, CopyFn] {
  const copy: CopyFn = async (text) => {
    if (!navigator?.clipboard) {
      console.warn("Clipboard not supported");
      return false;
    }

    // Try to save to clipboard then save it in the state if worked
    try {
      await navigator.clipboard.writeText(text);
      showSuccessToast("Copied to clipboard");
      return true;
    } catch (error) {
      console.warn("Copy failed", error);

      return false;
    }
  };

  return [null, copy];
}
