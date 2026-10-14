export function downloadExcel(file: {
  fileName: string;
  contentBase64: string;
}) {
  const bytes = Uint8Array.from(atob(file.contentBase64), (char) =>
    char.charCodeAt(0),
  );
  const url = URL.createObjectURL(
    new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = file.fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
