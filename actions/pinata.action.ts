import axios from "axios";

export async function uploadToPinata(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post("/api/pinata", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}
