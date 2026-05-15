/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AddressDisplay,
  Button,
  Input,
  ModalErrorContent,
  Page,
  Stepper,
  TxSuccess,
} from "components";
import { ColumnFlex, InputsContainer, SubmitButton } from "styles";
import { makeElipsisAddress, parseFormInputError } from "utils";
import { Controller, useForm } from "react-hook-form";
import { Skeleton } from "antd";

const SANITY_STEP_MIN_AMOUNT = 4.8;

import {
  useDeploySingleNominatorTx,
  useRoles,
  useSingleNominatorBalance,
  useTransferFundsTx,
  useValidateRoles,
  useVerifySNAddress,
  useWithdrawTx,
} from "hooks";
import { FormValues, inputs, Steps, useStore } from "./store";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyledAddresses } from "./styles";
import { ZERO_ADDR } from "consts";
import { useTonAddress } from "@tonconnect/ui-react";
import { Alert, Modal } from "antd";
import { getBalance, isEqualAddresses } from "helpers/util";
import { showSuccessToast } from "toasts";
import { useNavigate } from "react-router-dom";
import { styled } from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fromNano } from "ton-core";
import axios from "axios";
import { DownloadFilesStep } from "./DownloadFilesStep";

const withdrawError = (message: string, title?: string) => {
  const showError = message.indexOf("single nominator balance") > -1;

  Modal.error({
    title: title || "Withdraw failed",
    content: <ModalErrorContent message={showError ? message : ""} />,
    okText: "Close",
  });
};

export const Addresses = () => {
  const { ownerAddress, validatorAddress, snAddress } = useStore();
  return (
    <StyledAddresses $gap={20}>
      {snAddress && (
        <AddressDisplay title="Single nominator" address={snAddress} />
      )}
      {ownerAddress && <AddressDisplay title="Owner" address={ownerAddress} />}
      {validatorAddress && (
        <AddressDisplay title="Validator" address={validatorAddress} />
      )}
    </StyledAddresses>
  );
};

const ZeroButton = ({ onChange }: { onChange: (value: string) => void }) => {
  return <button onClick={() => onChange(ZERO_ADDR)}>Zero Address</button>;
};

const ConnectedWalletBtn = ({
  onChange,
}: {
  onChange: (value: string) => void;
}) => {
  const address = useTonAddress();

  return <button onClick={() => onChange(address)}>Connected Wallet</button>;
};

const MapButton = ({
  name,
  onChange,
}: {
  name: string;
  onChange: (value: string) => void;
}) => {
  if (name === "validatorAddress") {
    return <ZeroButton onChange={onChange} />;
  }
  if (name === "ownerAddress") {
    return <ConnectedWalletBtn onChange={onChange} />;
  }
  return null;
};

const FirstStep = () => {
  const { setFromValues } = useStore();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  return (
    <Stepper.Step>
      <Stepper.StepTitle>Set owner and validator addresses</Stepper.StepTitle>
      <form
        onSubmit={handleSubmit((data) => setFromValues(data as FormValues))}
      >
        <ColumnFlex $noGap>
          <InputsContainer>
            {inputs.map((input) => {
              return (
                <Controller
                  name={input.name}
                  control={control}
                  key={input.name}
                  rules={{ required: input.required, validate: input.validate }}
                  render={({ field }) => {
                    const errorMsg = parseFormInputError(
                      errors[input.name]?.type,
                      input.error
                    );
                    return (
                      <Input
                        info={input.info}
                        label={input.label}
                        field={field}
                        error={errorMsg}
                        button={
                          !field.value && (
                            <MapButton
                              name={input.name}
                              onChange={field.onChange}
                            />
                          )
                        }
                      />
                    );
                  }}
                />
              );
            })}
          </InputsContainer>
          <SubmitButton connectionRequired type="submit">
            Next
          </SubmitButton>
        </ColumnFlex>
      </form>
    </Stepper.Step>
  );
};

const DesployStep = () => {
  const { ownerAddress, validatorAddress, nextStep, setFromValues } =
    useStore();
  const { mutate, isLoading } = useDeploySingleNominatorTx();
  const error = useCallback((message: string) => {
    Modal.error({
      title: "Deploy failed",
      content: <ModalErrorContent message={message} />,
      okText: "Close",
    });
  }, []);

  const onSubmit = () => {
    mutate({
      owner: ownerAddress,
      validator: validatorAddress,
      onSuccess: (snAddress: string) => {
        setFromValues({
          snAddress,
        });
        nextStep();
        showSuccessToast("Deployed successfully");
      },
      onError: error,
    });
  };

  return (
    <Stepper.Step>
      <Stepper.StepTitle>Deploy</Stepper.StepTitle>
      <Stepper.StepSubtitle>
        Your wallet needs to have at least 2 TON coins for deployment. At least
        1 TON coin should remain in single-nominator balance at all time for
        storage fee costs on masterchain.
      </Stepper.StepSubtitle>
      <Addresses />
      <SubmitButton onClick={onSubmit} isLoading={isLoading}>
        Deploy
      </SubmitButton>
    </Stepper.Step>
  );
};

const VerifyDataStep = () => {
  const store = useStore();
  const { nextStep, snAddress } = store;
  const { mutate, isLoading } = useValidateRoles();

  const error = useCallback(() => {
    Modal.error({
      title: "Data verification failed",
      content: <ModalErrorContent />,
      okText: "Close",
    });
  }, []);

  const onSubmit = () => {
    mutate({
      snAddress,
      onwerAddress: store.ownerAddress,
      validatorAddress: store.validatorAddress,
      onError: error,
      onSuccess: () => {
        nextStep();
        showSuccessToast("Data verified successfully");
      },
    });
  };

  return (
    <Stepper.Step>
      <Stepper.StepTitle>Verify data</Stepper.StepTitle>
      <Stepper.StepSubtitle>
        After deployment is complete, this step will read the data from
        single-nominator contract that was just deployed and compare it to the
        data that was submitted.
      </Stepper.StepSubtitle>

      <Addresses />
      <SubmitButton onClick={onSubmit} isLoading={isLoading}>
        Verify data
      </SubmitButton>
    </Stepper.Step>
  );
};

const VerifyCodeHashStep = () => {
  const { mutate, isLoading } = useVerifySNAddress();
  const { nextStep, snAddress } = useStore();

  const { data: roles, isLoading: rolesLoading } = useRoles(snAddress);

  const error = useCallback(() => {
    Modal.error({
      title: "Code hash verification failed",
      content: <ModalErrorContent />,
      okText: "Close",
    });
  }, []);

  const onSubmit = () => {
    mutate({
      snAddress,
      onSuccess: () => {
        nextStep();
        showSuccessToast("Code hash verified successfully");
      },
      onError: error,
    });
  };

  return (
    <Stepper.Step>
      <Stepper.StepTitle>Verify Codehash</Stepper.StepTitle>
      <Stepper.StepSubtitle>
        After deployment is complete, this step will read the code hash from
        single-nominator contract that was just deployed and compare it to the
        code hash of the audited version.
      </Stepper.StepSubtitle>
      <StyledAddresses $gap={20}>
        <AddressDisplay title="Single nominator" address={snAddress} />
        <AddressDisplay
          isLoading={rolesLoading}
          title="Owner"
          address={roles?.owner}
        />
        <AddressDisplay
          isLoading={rolesLoading}
          title="Validator"
          address={roles?.validatorAddress}
        />
      </StyledAddresses>
      <SubmitButton onClick={onSubmit} isLoading={isLoading}>
        Verify Codehash
      </SubmitButton>
    </Stepper.Step>
  );
};

const SuccessStep = () => {
  const { reset } = useStore();
  const navigate = useNavigate();

  const onClick = () => {
    reset();
    navigate("/");
  };
  return (
    <Stepper.Step>
      <Stepper.StepTitle>Success</Stepper.StepTitle>
      <TxSuccess
        text="Successfully deployed single nominator"
        button={<Button onClick={onClick}>Home</Button>}
      />
    </Stepper.Step>
  );
};

const validateSanityTestSNBalance = async (
  snAddress: string,
  forceDeposit?: boolean
) => {
  const balance = fromNano(await getBalance(snAddress));
  if (forceDeposit) {
    throw new Error(
      `You must deposit ${parseFloat(
        (5 - Number(balance)).toFixed(2)
      )} TON to single nominator`
    );
  }

  if (!withdrawValidation(balance)) {
    throw new Error(
      `Sanity test cannot be completed because single nominator balance is ${Number(
        balance
      ).toFixed(2)} TON, you must withdraw at least ${(
        Number(balance) - 2
      ).toFixed(0)} TON to complete this step`
    );
  }
  return true;
};

const withdrawValidation = (amount?: string | number) => {
  return Number(amount || 0) <= 2;
};

const useIsOwner = () => {
  const { snAddress } = useStore();
  const { data, isLoading } = useRoles(snAddress);
  const owner = data?.owner;
  const tonAddress = useTonAddress();

  return useMemo(() => {
    return {
      isOwner: isEqualAddresses(tonAddress, owner),
      isLoading,
    };
  }, [tonAddress, owner, isLoading]);
};

const WITHDRAW_STEP_AMOUNT = 3;

const SanityTestStepNotOwner = () => {
  const { snAddress, nextStep } = useStore();
  const tonAddress = useTonAddress();
  const [allowWithdraw, setAllowWithdraw] = useState(false);
  const { transfer, isLoading: transferLoading } = useSanityTestTransfer();

  const { data: balance = "", isLoading: balanceLoading } =
    useSingleNominatorBalance(snAddress!);

  useEffect(() => {
    setAllowWithdraw(Number(balance) >= WITHDRAW_STEP_AMOUNT);
  }, [balance]);

  useQuery({
    queryFn: async () => {
      if (await validateSanityTestSNBalance(snAddress)) {
        nextStep();
      }
      return true;
    },
    enabled: !!snAddress && !!allowWithdraw,
    queryKey: ["validateSingleNominatorBalance", snAddress, balance],
  });

  if (balanceLoading) {
    return <Skeleton />;
  }

  return (
    <>
      <SanityTestStepContent />
      <StyledSanityTestStepContent>
        <ColumnFlex>
          <StyledAlert
            message={`The connected wallet (${makeElipsisAddress(
              tonAddress
            )}) is not the owner of the single nominator contract. In order to complete the deployment proccess, it is crucial to test withdraw funds in order to prove access to the funds. You can connect with the onwer address and complete the sanity test, or withdraw funds using the owner wallet`}
            type="error"
          />
          {!allowWithdraw && (
            <SubmitButton
              connectionRequired
              isLoading={transferLoading}
              onClick={transfer}
            >
              Deposit {getAmountToDepositUI(balance)} TON
            </SubmitButton>
          )}
        </ColumnFlex>
      </StyledSanityTestStepContent>
    </>
  );
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


export async function waitForBalanceChanges(getBalance: () => Promise<any>) {
  const balance = await getBalance();
  
  for (let i = 0; i < 30; ++i) {
    // due to swap being fetch and not web3

    await delay(3_000); // to avoid potential rate limiting from public rpc
    const newBalance= await getBalance();
    if (newBalance.data !== balance.data) {
      return newBalance.data;
    }
  }
}


const useSanityTestTransfer = () => {
  const { snAddress } = useStore();
  const { mutate: transfer, isLoading: transferLoading } = useTransferFundsTx();

  const { data: balance, refetch } = useSingleNominatorBalance(snAddress!);
  const queryClient = useQueryClient();

  const onTransfer = useCallback(async () => {
    const error = () => {
      Modal.error({
        title: "Deposit failed",
        content: <ModalErrorContent />,
        okText: "Close",
      });
    };

    transfer({
      amount: (5 - Number(balance)).toString(),
      address: snAddress!,
      onSuccess: async () => {
        await waitForBalanceChanges(refetch);
        showSuccessToast("Funds deposited");
      },
      onError: error,
    });
  }, [transfer, balance, snAddress, queryClient]);

  return {
    transfer: onTransfer,
    isLoading: transferLoading,
  };
};

const getAmountToDepositUI = (balance?: string) => {
  return parseFloat((5 - Number(balance)).toFixed(2));
};

const SanityTestStepOwner = () => {
  const { nextStep, snAddress } = useStore();
  const { data: balance } = useSingleNominatorBalance(snAddress!);

  const { mutate: withdraw, isLoading: withdrawLoading } = useWithdrawTx();
  const { transfer, isLoading: transferLoading } = useSanityTestTransfer();

  const onWithdraw = useCallback(() => {
    withdraw({
      address: snAddress,
      amount: WITHDRAW_STEP_AMOUNT.toString(),
      onError: withdrawError,
      onSuccess: async () => {
        showSuccessToast("Funds withdrawn");
        nextStep();
      },
    });
  }, [withdraw, snAddress, nextStep]);

  const allowWithdraw = useMemo(() => {
    return balance && Number(balance) > SANITY_STEP_MIN_AMOUNT;
  }, [balance]);

  if (!balance) {
    return <Skeleton />;
  }
  return (
    <>
      <Stepper.StepTitle>Sanity test withdrawal</Stepper.StepTitle>
      <Stepper.StepSubtitle>
        To make sure the Owner / admin was set correctly and can withdraw funds
        from single-nominator, we recommend doing a withdrawal test with a small
        amount of {WITHDRAW_STEP_AMOUNT} TON.
      </Stepper.StepSubtitle>
      <StyledSanityTestStepContent>
        <SubmitButton
          connectionRequired
          isLoading={withdrawLoading || transferLoading}
          onClick={allowWithdraw ? onWithdraw : transfer}
        >
          {allowWithdraw
            ? ` Withdraw ${WITHDRAW_STEP_AMOUNT} TON`
            : `Deposit ${getAmountToDepositUI(balance)} TON`}
        </SubmitButton>
      </StyledSanityTestStepContent>
    </>
  );
};

const StyledSanityTestStepContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const SanityTestStepContent = () => {
  return (
    <>
      <Stepper.StepTitle>Sanity test withdrawal</Stepper.StepTitle>
      <Stepper.StepSubtitle>
        To make sure the Owner / admin was set correctly and can withdraw funds
        from single-nominator, we recommend doing a withdrawal test with a small
        amount of {WITHDRAW_STEP_AMOUNT} TON.
      </Stepper.StepSubtitle>
    </>
  );
};

export const SanityTestStep = () => {
  const { isOwner, isLoading } = useIsOwner();

  return (
    <Stepper.Step>
      {isLoading ? (
        <Skeleton />
      ) : isOwner ? (
        <SanityTestStepOwner />
      ) : (
        <SanityTestStepNotOwner />
      )}
    </Stepper.Step>
  );
};

const StyledAlert = styled(Alert)({
  marginTop: 20,
});

const steps = [
  {
    title: "Set owner and validator addresses",
    component: <FirstStep />,
  },
  {
    title: "Deploy",
    component: <DesployStep />,
  },
  {
    title: "Verify Data",
    component: <VerifyDataStep />,
  },
  {
    title: "Verify Codehash",
    component: <VerifyCodeHashStep />,
  },
  {
    title: "Sanity test",
    component: <SanityTestStep />,
  },
  {
    title: "Download files",
    component: <DownloadFilesStep />,
  },
  {
    title: "",
    component: <SuccessStep />,
  },
];

function DeploySingleNominatorPage() {
  const { step, setStep } = useStore();
  return (
    <Page title="Deploy single nominator">
      <Stepper setStep={setStep} currentStep={step} steps={steps} />
    </Page>
  );
}

export default DeploySingleNominatorPage;
