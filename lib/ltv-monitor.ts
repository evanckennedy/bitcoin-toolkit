export type LtvInputs = {
  btcCollateral: number;
  loanBalance: number;
  liquidationThreshold: number; // percent, e.g. 80
  btcPrice: number;
};

export type LtvResults = {
  currentLtv: number; // percent
  liquidationPrice: number; // USD per BTC
  dollarDropToLiquidation: number;
  percentDropToLiquidation: number;
  collateralValue: number;
};

export function calculateLtv(inputs: LtvInputs): LtvResults {
  const { btcCollateral, loanBalance, liquidationThreshold, btcPrice } = inputs;

  const collateralValue = btcCollateral * btcPrice;
  const currentLtv =
    collateralValue === 0 ? 0 : (loanBalance / collateralValue) * 100;

  // Price at which LTV hits the liquidation threshold:
  // loanBalance / (btcCollateral * liquidationPrice) = threshold / 100
  const liquidationPrice =
    loanBalance / (btcCollateral * (liquidationThreshold / 100));

  const dollarDropToLiquidation = Math.max(0, btcPrice - liquidationPrice);
  const percentDropToLiquidation =
    btcPrice === 0 ? 0 : (dollarDropToLiquidation / btcPrice) * 100;
  const safetyBuffer = liquidationThreshold - currentLtv;

  return {
    currentLtv,
    liquidationPrice,
    dollarDropToLiquidation,
    percentDropToLiquidation,
    collateralValue,
  };
}
