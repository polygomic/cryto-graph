/* eslint-disable prefer-const */
import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { Pair } from "../../../generated/templates/Pair/Pair";

export let BI_ZERO = BigInt.fromI32(0);
export let BI_ONE = BigInt.fromI32(1);
export let BD_ZERO = BigDecimal.fromString("0");
export let BD_1E18 = BigDecimal.fromString("1e18");

export let TRACKED_PAIRS: string[] = [
  "0x912C1943C1FEE223F37eCaF03BE87f1aBD8dEdB0", // WCRYTO-CRUSD
  "0x19753ed08E38710A262e78853C2CEBE2A7B29AEA", // WCRYTO-CRSWAP
];

export function getCrytoPriceInUSD(): BigDecimal {
  // Bind WCRYTO/BUSD contract to query the pair.
  let pairContract = Pair.bind(Address.fromString(TRACKED_PAIRS[0]));

  // Fail-safe call to get CRYTO price as BUSD.
  let reserves = pairContract.try_getReserves();
  if (!reserves.reverted) {
    let reserve0 = reserves.value.value0.toBigDecimal().div(BD_1E18);
    let reserve1 = reserves.value.value1.toBigDecimal().div(BD_1E18);

    if (reserve0.notEqual(BD_ZERO)) {
      return reserve1.div(reserve0);
    }
  }

  return BD_ZERO;
}
