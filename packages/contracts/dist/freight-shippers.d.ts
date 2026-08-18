export interface FreightShipper {
    id: string;
    name: string;
    scacCode: string | null;
    country: string | null;
    notes: string | null;
    active: boolean;
    createdAt: string;
}
export interface FreightShipperDirectory {
    items: FreightShipper[];
    total: number;
}
