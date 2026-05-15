/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Address,
  Cell,
  beginCell,
  contractAddress,
  Sender,
  toNano,
} from "ton-core";
import { compileFunc } from "@ton-community/func-js";
import { Buffer } from "buffer";
import { getClientV2 } from "helpers/client";
import { waitForContractToBeDeployed, SINGLE_NOMINATOR_CODE_HASHES } from "./util";
import { BASE_URL, DEPLOY_VALUE } from "consts";

const MSG_VALUE = import.meta.env.DEV ? toNano(0.1) : toNano(DEPLOY_VALUE);

  
async function getDeployCodeAndData(owner: Address, validator: Address) {
  const stdlibFileResponse = await fetch(`${BASE_URL}/contracts/stdlib.fc`);
  const singleNominatorFileResponse = await fetch(
    `${BASE_URL}/contracts/single-nominator.fc`
  );

  console.log({ singleNominatorFileResponse });
  

  if (!stdlibFileResponse.ok || !singleNominatorFileResponse.ok) {
    console.error("Failed to fetch one or more files.");
    return;
  }

  const stdlibContent = await stdlibFileResponse.text();
  const singleNominatorContent = await singleNominatorFileResponse.text();

  const result = await compileFunc({
    optLevel: 2,
    targets: ["stdlib.fc", "single-nominator.fc"],
    sources: {
      "stdlib.fc": stdlibContent,
      "single-nominator.fc": singleNominatorContent,
    },
  });

  if (result.status === "error") {
    console.error(result.message);
    return;
  }

  const initialCode = Cell.fromBoc(Buffer.from(result.codeBoc, "base64"))[0];

  const codeHash = initialCode.hash().toString("base64");
  if (!SINGLE_NOMINATOR_CODE_HASHES.includes(codeHash)) {
    throw new Error(
      `Contract code hash mismatch (got ${codeHash}). Deploy aborted to protect funds.`
    );
  }

  const initialData = beginCell()
    .storeAddress(owner)
    .storeAddress(validator)
    .endCell();

  return { code: initialCode, data: initialData };
}

export async function deploy(sender: Sender, owner: string, validator: string) {
  const ownerAddr = Address.parse(owner);
  const validatorAddr = Address.parse(validator);

  if (ownerAddr.workChain !== 0) {
    throw new Error("Owner address must be on workchain 0 (basechain)");
  }
  if (validatorAddr.workChain !== -1) {
    throw new Error("Validator address must be on workchain -1 (masterchain)");
  }

  const client = await getClientV2();
  const singleNominatorCodeAndData = await getDeployCodeAndData(
    ownerAddr,
    validatorAddr
  );

  if (!singleNominatorCodeAndData?.code || !singleNominatorCodeAndData?.data) {
    throw new Error("Failed to prepare contract code/data; aborting deploy.");
  }

  const singleNominatorAddress = contractAddress(-1, {
    code: singleNominatorCodeAndData?.code,
    data: singleNominatorCodeAndData?.data,
  });
  console.log({
    singleNominatorAddress,
    singleNominatorCodeAndData,
    MSG_VALUE,
  });
  
  const isDeployed = await client.isContractDeployed(singleNominatorAddress);
  if (isDeployed) {
    return {
      success: true,
      singleNominatorAddress: singleNominatorAddress.toString(),
    };
  }

  console.log({ isDeployed });

  await sender.send({
    to: singleNominatorAddress,
    value: MSG_VALUE,
    sendMode: 1,
    init: singleNominatorCodeAndData,
  });

  const success = await waitForContractToBeDeployed(
    client,
    singleNominatorAddress
  );
  return {
    success,
    singleNominatorAddress: singleNominatorAddress.toString(),
  };
}
