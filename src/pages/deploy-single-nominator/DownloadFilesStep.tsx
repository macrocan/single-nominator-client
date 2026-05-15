/* eslint-disable @typescript-eslint/no-explicit-any */
import { Stepper } from "components";
import { SubmitButton } from "styles";
import file1 from "assets/files/mytonctrl-add-sn-files.sh";
import file2 from "assets/files/recover-stake.fif";
import file3 from "assets/files/validator-elect-signed.fif";
import file4 from "assets/files/validator-withdraw.fif";
import saveAs from "file-saver";
import { useStore } from "./store";
import { Address } from "ton-core";
import JSZip from "jszip";

const files = [
  { name: "mytonctrl-add-sn-files.sh", file: file1 },
  { name: "recover-stake.fif", file: file2 },
  { name: "validator-elect-signed.fif", file: file3 },
  { name: "validator-withdraw.fif", file: file4 },
];

async function stringToBinaryFile(singleNominatorAddr: string) {
  return Address.parse(singleNominatorAddr).toRaw();
}

async function fetchShFileContent(url: string) {
  const response = await fetch(url);
  return response.text();
}

export const DownloadFilesStep = () => {
  const { snAddress, ownerAddress, validatorAddress, nextStep } = useStore();

  const download = async () => {
    const zip = new JSZip();

    const arrayBuffer = await stringToBinaryFile(snAddress);

    await Promise.all(
      files.map(async (file) => {
        const content = await fetchShFileContent(file.file);
        zip.file(file.name, content);
      })
    );

    zip.file(
      "single-nominator.addr",
      new Blob([new Uint8Array(arrayBuffer)], { type: "application/octet-stream" })
    );

    const data = [
      ["single nominator address", "owner address", "validator address"],
      [snAddress, ownerAddress, validatorAddress],
    ];

    let csvContent = "";
    data.forEach((row) => {
      const csvRow = row.join(",");
      csvContent += csvRow + "\r\n";
    });

    zip.file("single-nominator-info.csv", csvContent);

    zip.generateAsync({ type: "blob" }).then((blob) => {
      saveAs(blob, "mytonctrl-sn-files.zip");
    });

    nextStep();
  };

  return (
    <Stepper.Step>
      <Stepper.StepTitle>Download files</Stepper.StepTitle>
      <Stepper.StepSubtitle>
        Download the files to your computer
      </Stepper.StepSubtitle>

      <SubmitButton onClick={download}>Download</SubmitButton>
    </Stepper.Step>
  );
};
