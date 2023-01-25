/* eslint-disable prefer-const */
import { BigDecimal, Address } from "@graphprotocol/graph-ts/index";
import { Pair, Token, Bundle } from "../../generated/schema";
import { ZERO_BD, factoryContract, ADDRESS_ZERO, ONE_BD } from "./utils";

const WCRYTO_ADDRESS = "0x791b800dec21f46402b03dc5E70DFC36415F9865";
const WCRYTO_CRUSD_PAIR = "0x912C1943C1FEE223F37eCaF03BE87f1aBD8dEdB0"; // created block 636298

export function getCrytoPriceInUSD(): BigDecimal {
  // fetch cryto prices for each stablecoin
  let crusdPair = Pair.load(WCRYTO_CRUSD_PAIR); // busd is token1

  // all 3 have been created
  if (crusdPair !== null) {
    return crusdPair.token1Price;
  } else {
    return ZERO_BD;
  }
}

// token where amounts should contribute to tracked volume and liquidity
let WHITELIST: string[] = [
  "0x791b800dec21f46402b03dc5E70DFC36415F9865", // WCRYTO
  "0x492ffa18b9D3830Ebc5D59D5855219C591756234", // CRUSD
  "0xbAAeB48E51d2B8cd75914FA0d4B3cf6f06Ca9a5b", // CRYTOSW
];

let WHITELISTPAIRS: string[] = [
  "0x19753ed08E38710A262e78853C2CEBE2A7B29AEA", // WCRYTO-CRSWAP
  "0x912C1943C1FEE223F37eCaF03BE87f1aBD8dEdB0", // WCRYTO-CRUSD
  "0x64fF46B71dDF5B900eF59baa9D55B1BC519f780B", // WCRYTO-NFT
  "0x5C2a3279474b532a7610D8e4Bd5982a651bc3D90", // WCRYTO-IMAGE
  "0xFAEb4B29aA9E154111A9E8D11f35781F3D2F6A4c", // WCRYTO-META+
  "0x9DF4c060860d0aC73F75C13d02144e0d62F3314F", // WCRYTO-WEB
  "0xf0490CEC064e873ED936ECc7fE76B78FAa29a63e", // WCRYTO-PROFIT
  "0x6bF7cDA2f7C068e1a24A44512Be5EA78035061e3", // WCRYTO-DANCO
  "0x546dE91a85103eef220cac3B3F8c8599D1a9a36F", // WCRYTO-VLAND
  "0x332545cBce9Ce7138Be286a44dcC187f811D02a0", // NFT-CRUSD
  "0x7827Acdd11AD671575274c2330d2c03bb6e69450", // IMAGE-CRUSD
  "0xa2cb0e86986B913658BCdA3A89013e44476dc0Dd", // META+-CRUSD
  "0xaA691FBED27d847C3Bd9d2cd5204114dB8a5A4cA", // WEB-CRUSD
  "0x9c78E20A8C7AD3D8EDB42a0D47F6a6E267173326", // PROFIT-CRUSD
  "0x340ae9ED2E19E4B47c33dBCD3c0EAd6ca848a88e", // DANCO-CRUSD
  "0x94E04a9e5DA833cfD4b2879FCb6709B13aA770C9", // CRSWAP-CRUSD
  "0xe7cBa581393BcD33223131fa2D8E5B80df008afa", // VLAND-CRUSD
  "0x03d821A2aeBdB418C5AaF5413FC1a80182363133", // CRSWAP-NFT
  "0xa579845589E2Cd1111E4E3712341464ef4c9647C", // CRSWAP-IMAGE
  "0x6D1625b653B404Eb7DbF73E59B388C88c7B2b982", // CRSWAP-META+
  "0x4a173213f22eC15B3E27a234249f20D26aA3EBba", // CRSWAP-WEB
  "0xce045A12FF2eC37188C5cAE5fe0d613aa5437dC8", // CRSWAP-PROFIT
  "0x69Db8D1af1F367e75Ae31a6A783C4E273B6DFB75", // CRSWAP-DANCO
  "0x5Ae3fF5CA49D6Ce400e64B818197F34eB8742828", // CRSWAP-VLAND
];

let BLACKLISTTOKENS: string[] = [
  "0xef6c6da56fc3509ac291657b2c0d6e5ce3ffeecd", // Cryto DeFi (CY)
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
      if (WHITELISTPAIRS.includes(pairAddress.toHexString())) {
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
