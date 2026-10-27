// Branches for store pickup

export interface Branch {
  id: string;
  name: string;
  address: string;
  hours: string;
  phone: string;
  phones: string[];
}

export const BRANCHES: Record<string, Branch> = {
  main: {
    id: "main",
    name: "LAZAROPH Marikina",
    address: "Max Bldg, 911 J. P. Rizal St, Concepcion Uno, Marikina, 1805 Metro Manila",
    hours: "Daily, 11:00 AM - 8:00 PM", // TODO: owner to confirm
    phone: "0917 109 3557", // TODO: owner to confirm which number to publish
    phones: ["0917 109 3557", "02 8294 8572"],
  },
};

export const DEFAULT_PICKUP_BRANCH_ID = "main";

export function getBranch(id: string): Branch | undefined {
  return BRANCHES[id];
}