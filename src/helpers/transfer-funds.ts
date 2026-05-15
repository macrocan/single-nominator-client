import { Address, Sender, toNano } from "ton-core";
import { getClientV2 } from "./client";
import { waitForConditionChange } from "./util";

export async function transferFunds(
  sender: Sender,
  singleNominatorAddr: string,
  amount: string
) {
  const client = await getClientV2();

  const oldBalance = (
    await client.getBalance(Address.parse(singleNominatorAddr))
  ).toString();

  await sender.send({
    to: Address.parse(singleNominatorAddr),
    value: toNano(amount),
    sendMode: 1,
  });

  return await waitForConditionChange(
    () => client.getBalance(Address.parse(singleNominatorAddr)),
    BigInt(oldBalance)
  );
}
