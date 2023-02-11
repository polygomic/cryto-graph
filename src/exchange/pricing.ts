/* eslint-disable prefer-const */
import { BigDecimal, Address } from "@graphprotocol/graph-ts/index";
import { Pair, Token, Bundle } from "../../generated/schema";
import { ZERO_BD, factoryContract, ADDRESS_ZERO, ONE_BD } from "./utils";

const WCRYTO_ADDRESS = "0x791b800dec21f46402b03dc5E70DFC36415F9865";
const WCRYTO_CRUSD_PAIR = "0x912C1943C1FEE223F37eCaF03BE87f1aBD8dEdB0"; // created block 636298

export function getCrytoPriceInUSD(): BigDecimal {
  // fetch cryto prices for each stablecoin
  let crusdPair = Pair.load(WCRYTO_CRUSD_PAIR); // crusd is token0

  // all 3 have been created
  if (crusdPair !== null) {
    return crusdPair.token0Price;
  } else {
    return ZERO_BD;
  }
}

// token where amounts should contribute to tracked volume and liquidity
let WHITELIST: string[] = [
  "0x791b800dec21f46402b03dc5E70DFC36415F9865", // WCRYTO
  "0x492ffa18b9D3830Ebc5D59D5855219C591756234", // CRUSD
  "0xbAAeB48E51d2B8cd75914FA0d4B3cf6f06Ca9a5b", // CYTOSW
  "0xc9DBB5EC38BbB50dAca275e54CB9659d46634b5e", // STOCK
];

// minimum liquidity for price to get tracked
let MINIMUM_LIQUIDITY_THRESHOLD_CRYTO = BigDecimal.fromString("5");

/**
 * Search through graph to find derived CRYTO per token.
 * @todo update to be derived CRYTO (add stablecoin estimates)
 **/
export function findCrytoPerToken(token: Token): BigDecimal {
  if (token.id == WCRYTO_ADDRESS) {
    return ONE_BD;
  }
  // loop through whitelist and check if paired with any
  for (let i = 0; i < WHITELIST.length; ++i) {
    let pairAddress = factoryContract.getPair(Address.fromString(token.id), Address.fromString(WHITELIST[i]));
    if (pairAddress.toHexString() != ADDRESS_ZERO) {
      let pair = Pair.load(pairAddress.toHexString());
      if (pair.token0 == token.id && pair.reserveCRYTO.gt(MINIMUM_LIQUIDITY_THRESHOLD_CRYTO)) {
        let token1 = Token.load(pair.token1);
        return pair.token1Price.times(token1.derivedCRYTO as BigDecimal); // return token1 per our token * CRYTO per token 1
      }
      if (pair.token1 == token.id && pair.reserveCRYTO.gt(MINIMUM_LIQUIDITY_THRESHOLD_CRYTO)) {
        let token0 = Token.load(pair.token0);
        return pair.token0Price.times(token0.derivedCRYTO as BigDecimal); // return token0 per our token * CRYTO per token 0
      }
    }
  }
  return ZERO_BD; // nothing was found return 0
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD.
 * If both are, return average of two amounts
 * If neither is, return 0
 */
export function getTrackedVolumeUSD(
  bundle: Bundle,
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  let price0 = token0.derivedCRYTO.times(bundle.crytoPrice);
  let price1 = token1.derivedCRYTO.times(bundle.crytoPrice);

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1)).div(BigDecimal.fromString("2"));
  }

  // take full value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0);
  }

  // take full value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1);
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD;
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export function getTrackedLiquidityUSD(
  bundle: Bundle,
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  let price0 = token0.derivedCRYTO.times(bundle.crytoPrice);
  let price1 = token1.derivedCRYTO.times(bundle.crytoPrice);

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1));
  }

  // take double value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).times(BigDecimal.fromString("2"));
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1).times(BigDecimal.fromString("2"));
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD;
}
