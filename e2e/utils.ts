export const cross = <T extends readonly unknown[]>(
  ...values: T
): Array<{
  [K in keyof T]: T[K] extends readonly (infer U)[] ? U : never;
}> => {
  const lengths: number[] = values.map((d: any) => d.length || 0);
  const j: number = values.length - 1;
  const index: number[] = new Array(j + 1).fill(0);
  const product: Array<{
    [K in keyof T]: T[K] extends readonly (infer U)[] ? U : never;
  }> = [];

  if (j < 0 || lengths.some((length: number) => !(length > 0))) return product;

  while (true) {
    product.push(
      index.map((j: number, i: number) => values[i][j]) as {
        [K in keyof T]: T[K] extends readonly (infer U)[] ? U : never;
      }
    );
    let i: number = j;
    while (++index[i] === lengths[i]) {
      if (i === 0) return product;
      index[i--] = 0;
    }
  }
};
