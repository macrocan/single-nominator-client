import { transferFunds } from "helpers/transfer-funds";
import { withdraw } from "helpers/withdraw";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useGetSender } from "./common";
import { changeValidator, roles } from "helpers/change-validator";
import { deploy } from "helpers/deploy";
import { isTonAddress } from "utils";
import {
  getBalance,
  isEqualAddresses,
  isMatchSingleNominatorCodeHash,
} from "helpers/util";
import { fromNano } from "ton-core";
import { useCallback } from "react";

export const useWithdrawTx = () => {
  const getSender = useGetSender();
  return useMutation(
    ({
      address,
      amount,
    }: {
      address: string;
      amount?: string;
      onSuccess?: (value?: string) => void;
      onError?: (value: string) => void;
    }) => {
      return withdraw(getSender(), address, amount);
    },
    {
      onSuccess: (data, args) => {
        args.onSuccess?.();
      },
      onError: (error, args) => {
        if (error instanceof Error) {
          args.onError?.(error.message);
        }
      },
    }
  );
};


export const useTransferFundsTx = () => {
  const getSender = useGetSender();
  return useMutation(
    async (data: {
      address: string;
      amount: string;
      onSuccess?: () => void | Promise<void>;
      onError?: (value: string) => void;
    }) => {
      const res = await transferFunds(
        getSender(),
        data.address,
        data.amount
      );
      await data.onSuccess?.();
      return res;
    },
    {
      onError: (error, args) => {
        if (error instanceof Error) {
          args.onError?.(error.message);
        }
      },
    }
  );
};

export const useChangeValidatorTx = () => {
  const getSender = useGetSender();
  return useMutation(
    ({
      address,
      newAddress,
      oldValidatorAddress,
    }: {
      address: string;
      newAddress: string;
      oldValidatorAddress: string;
      onSuccess?: () => void;
      onError?: (value: string) => void;
    }) => {
      return changeValidator(
        getSender(),
        address,
        newAddress,
        oldValidatorAddress
      );
    },
    {
      onSuccess: (data, args) => {
        args.onSuccess?.();
      },
      onError: (error, args) => {
        if (error instanceof Error) {
          args.onError?.(error.message);
        }
      },
    }
  );
};

export const useDeploySingleNominatorTx = () => {
  const getSender = useGetSender();
  return useMutation(
    async ({
      owner,
      validator,
    }: {
      owner: string;
      validator: string;
      onSuccess: (value: string) => void;
      onError?: (value: string) => void;
    }) => {
      const result = await deploy(getSender(), owner, validator);
      if (!result.success) {
        throw new Error("Deploy failed");
      }
      return result.singleNominatorAddress;
    },
    {
      onError: (error, args) => {
        if (error instanceof Error) {
          args.onError?.(error.message);
        }
      },
      onSuccess: (singleNominatorAddress, args) => {
        args.onSuccess(singleNominatorAddress);
      },
    }
  );
};

export const useVerifySNAddress = () => {
  return useMutation(
    async ({
      snAddress,
    }: {
      snAddress: string;
      onSuccess?: () => void;
      onError?: (value: string) => void;
    }) => {
      const result = await isMatchSingleNominatorCodeHash(snAddress);
      if (!result) {
        throw new Error("Not match");
      }
      return result;
    },
    {
      onSuccess: (result, args) => {
        args.onSuccess?.();
      },
      onError: (error, args) => {
        if (error instanceof Error) {
          args.onError?.(error.message);
        }
      },
    }
  );
};

export const useRoles = (address?: string) => {
  return useQuery({
    queryKey: ["useRoles", address],
    queryFn: async () => {
      return roles(address!);
    },
    enabled: !!address && isTonAddress(address),
  });
};

export const useSingleNominatorBalance = (address?: string) => {
  return useQuery({
    queryFn: async () => {
      const result = await getBalance(address!);
      return fromNano(result);
    },
    queryKey: ["useSingleNominatorBalance", address],
    enabled: !!address && isTonAddress(address),
    refetchInterval: 5_000,
  });
};

export const useValidateSingleNominator = (address?: string) => {
  return useQuery({
    queryKey: ["useValidateSingleNominator", address],
    queryFn: async () => {
      return isMatchSingleNominatorCodeHash(address!);
    },
    enabled: !!address && isTonAddress(address),
  });
};

export const useValidateRoles = () => {
  return useMutation({
    mutationFn: async ({
      snAddress,
      onwerAddress,
      validatorAddress,
    }: {
      snAddress: string;
      onwerAddress: string;
      validatorAddress: string;
      onError?: (error: string) => void;
      onSuccess?: () => void;
    }) => {
      const result = await roles(snAddress);

      if (
        !isEqualAddresses(result?.owner, onwerAddress) ||
        !isEqualAddresses(result?.validatorAddress, validatorAddress)
      ) {
        throw new Error("Not match");
      }
      return true;
    },
    onSuccess: (data, args) => {
      args.onSuccess?.();
    },
    onError: (error, args) => {
      if (error instanceof Error) {
        args.onError?.(error.message);
      }
    },
  });
};

