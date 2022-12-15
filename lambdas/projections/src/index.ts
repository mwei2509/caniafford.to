interface HouseholdInput {
    user: { [key: string]: any }
}

interface Projection {
    years?: number[]
}

export default function runProjections(household: HouseholdInput): Projection {
    return {};
}