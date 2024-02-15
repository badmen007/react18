import { createFiberRoot } from "./ReactFiberRoot";
export function createContainer(containerInfo, tag) {
  return createFiberRoot(containerInfo, tag);
}
