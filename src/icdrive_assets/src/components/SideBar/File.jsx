import { canisterHttpAgent } from '../../httpAgent';

const MAX_CHUNK_SIZE = 1024 * 1024 * 1.5; // 1.5MB

const encodeArrayBuffer = (file) => Array.from(new Uint8Array(file));

function getFileInit(
  file,
) {
  const chunkCount = Number(Math.ceil(file.size / MAX_CHUNK_SIZE));
  return {
    chunkCount,
    fileSize: file.size,
    name: file.name,
    mimeType: file.type,
    marked: false,
    sharedWith: [],
  };
}

export async function uploadFile(file, userAgent, dispatch, uploadProgress, uploadFileId) {
  const fileInit = getFileInit(file);
  const [fileId] = await userAgent.createFile(fileInit, localStorage.getItem('userName'));
  dispatch(uploadFileId(fileId.toString()));

  const fileObj = {
    chunkCount: fileInit.chunkCount,
    fileSize: file.size,
    fileId,
    name: file.name,
    marked: false,
    sharedWith: [],
    mimeType: fileInit.mimeType,
  };

  let chunk = 1;

  for (
    let byteStart = 0;
    byteStart < file.size;
    byteStart += MAX_CHUNK_SIZE, chunk += 1
  ) {
    const fileSlice = file.slice(byteStart, Math.min(file.size, byteStart + MAX_CHUNK_SIZE));
    const fileSliceBuffer = (await fileSlice.arrayBuffer()) || new ArrayBuffer(0);
    const sliceToNat = encodeArrayBuffer(fileSliceBuffer);
    await userAgent.putFileChunk(fileId, chunk, sliceToNat);

    dispatch(uploadProgress(100 * (chunk / fileObj.chunkCount).toFixed(2)));

    if (chunk >= fileInit.chunkCount) {
      dispatch(uploadFileId(''));
      dispatch(uploadProgress(0));
    }
  }
}

export async function useUploadFile(file, dispatch, uploadProgress, uploadFileId) {
  const userAgent = await canisterHttpAgent();
  console.info('Storing File...');
  try {
    console.time('Stored in');
    await uploadFile(file, userAgent, dispatch, uploadProgress, uploadFileId);
    console.timeEnd('Stored in');
  } catch (error) {
    console.error('Failed to store file.', error);
    return (0);
  }
}
