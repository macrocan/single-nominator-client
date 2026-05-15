/* eslint-disable @typescript-eslint/no-explicit-any */
import { Input, ModalErrorContent, Page } from "components";
import React, { useCallback, useMemo } from "react";
import { Container, InputsContainer, SubmitButton } from "styles";
import { useForm, Controller } from "react-hook-form";
import { isTonAddress, parseFormInputError } from "utils";
import { useVerifySNAddress, useWithdrawTx } from "hooks";
import { Modal } from "antd";

const useInputs = (isCustomAmount: boolean) => {
  return useMemo(() => {
    const inputs = [
      {
        label: "Single nominator address",
        name: "address",
        validate: isTonAddress,
        error: "Invalid address",
        info: "The address of the single-nominator contract that you want to withdraw from. Your wallet address must be the Owner / admin for this single-nominator.",
      },
      {
        label: "Amount to withdraw",
        name: "customAmount",
        type: "radio",
        info: "A decimal point number of the amount of TON coins that you would like to withdraw from single-nominator. This amount must be in single-nominator balance (unstaked).",
        radioOptions: [
          {
            title: "Max",
            value: "max",
          },
          {
            title: "Custom",
            value: "custom",
          },
        ],
      },
    ];

    if (isCustomAmount) {
      inputs.push({
        label: "Amount",
        name: "amount",
      } as any);
    }

    return inputs;
  }, [isCustomAmount]);
};

type FormValues = {
  address: string;
  amount: string;
};

function WithdrawPage() {
  return (
    <Page title="Withdraw">
      <Container>
        <Form />
      </Container>
    </Page>
  );
}

const Form = () => {
  const {
    handleSubmit,
    formState: { errors },
    control,
    watch,
    reset,
  } = useForm({
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const { mutate, isLoading } = useWithdrawTx();
  const isCustomAmount = watch("customAmount") === "custom";

  const inputs = useInputs(isCustomAmount);
  const { mutateAsync, isLoading: verifyLoading } = useVerifySNAddress();

  const error = useCallback((message: string) => {
    Modal.error({
      title: "Withdrawal failed",
      content: <ModalErrorContent message={message} />,
    });
  }, []);

  const success = useCallback(() => {
    Modal.success({
      title: 'Withdrawal successful',
      okText: "Close",
    });
  }, []);

  const onSubmit = async (data: FormValues) => {
    try {
      await mutateAsync({ snAddress: data.address });
    } catch (error) {
      Modal.error({
        title: "Withdrawal failed",
        content: (
          <ModalErrorContent message="Not a valid single nominator address" />
        ),
      });

      return;
    }

    mutate({
      address: data.address,
      amount: isCustomAmount ? data.amount : undefined,
      onSuccess: () => {
        success();
        reset();
      },
      onError: error,
    });
  };

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data as FormValues))}>
      <InputsContainer>
        {inputs.map((input) => {
          return (
            <Controller
              name={input.name}
              control={control}
              key={input.name}
              rules={{ required: true, validate: input.validate }}
              render={({ field }) => {
                const error = errors[input.name];
                const errorMsg = parseFormInputError(error?.type, input.error);

                return (
                  <Input
                    type={input.type}
                    label={input.label}
                    field={field as any}
                    error={errorMsg}
                    info={input.info}
                    radioOptions={input.radioOptions}
                  />
                );
              }}
            />
          );
        })}

        <SubmitButton
          connectionRequired
          isLoading={isLoading || verifyLoading}
          type="submit"
        >
          Withdraw
        </SubmitButton>
      </InputsContainer>
    </form>
  );
};

export default WithdrawPage;
