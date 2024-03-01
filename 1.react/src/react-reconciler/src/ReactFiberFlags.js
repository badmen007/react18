export const NoFlags = 0b0000000000000000000000000000;
export const Placement = 0b0000000000000000000000000010;
export const Update = 0b0000000000000000000000000100;

export const ChildDeletion = 0b0000000000000000000000010000;

export const Passive = 0b0000000000000000100000000000;

export const LayoutMask = Update;
export const Ref = 0b0000000000000000001000000000;
export const MutationMask = Placement | Update | ChildDeletion | Ref;
