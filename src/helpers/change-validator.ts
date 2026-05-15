import { Address, Sender, toNano, beginCell } from "ton-core";
import { getClientV2 } from "./client";
import { waitForConditionChange } from "./util";

const MSG_VALUE = toNano("0.1"); // OP::CHANGE_VALIDATOR_ADDRESS only writes storage; 0.1 TON is sufficient
const CHANGE_VALIDATOR_ADDRESS = 0x1001;

export async function changeValidator(
  sender: Sender,
  singleNominatorAddr: string,
  newValidatorAddr: string,
  oldValidatorAddress: string
) {
  const payload = beginCell()
    .storeUint(CHANGE_VALIDATOR_ADDRESS, 32)
    .storeUint(1, 64)
    .storeAddress(Address.parse(newValidatorAddr))
    .endCell();

  await sender.send({
    to: Address.parse(singleNominatorAddr),
    value: MSG_VALUE,
    sendMode: 1,
    body: payload,
  });
  
  return waitForConditionChange(async () => {
    return (await roles(singleNominatorAddr)).validatorAddress;
  }, oldValidatorAddress);
}

export async function roles(singleNominatorAddr: string) {
  const client = await getClientV2();
  const res = await client.runMethod(
    Address.parse(singleNominatorAddr),
    "get_roles"
  );
  const owner = res.stack.readAddress();
  const validatorAddress = res.stack.readAddress();

  return {
    owner: owner.toString(),
    validatorAddress: validatorAddress.toString(),
  };
}
