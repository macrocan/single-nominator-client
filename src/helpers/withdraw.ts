import { Address, Sender, toNano, fromNano, beginCell } from "ton-core";
import { getClientV2 } from "./client";
import { waitForConditionChange } from "./util";

const WITHDRAW = 0x1000;
const MSG_VALUE = toNano(0.1);

export async function withdraw(
  sender: Sender,
  singleNominatorAddr: string,
  amount?: string
) {
  const client = await getClientV2();

  const balance: bigint = await client.getBalance(
    Address.parse(singleNominatorAddr)
  );
  const amountNano: bigint = amount === undefined ? balance : toNano(amount);

  if (amountNano > balance) {
    throw new Error(
      `Amount ${fromNano(amountNano)} TON exceeds balance ${fromNano(
        balance
      )} TON`
    );
  }

  const payload = beginCell()
    .storeUint(WITHDRAW, 32)
    .storeUint(0, 64)
    .storeCoins(amountNano)
    .endCell();

  const oldBalance = balance.toString();

  await sender.send({
    to: Address.parse(singleNominatorAddr),
    value: MSG_VALUE,
    sendMode: 1,
    body: payload,
  });

  return await waitForConditionChange(
    () => client.getBalance(Address.parse(singleNominatorAddr)),
    BigInt(oldBalance)
  );
}
