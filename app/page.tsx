import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/utils/supabase/server";
import { createClient as createClientClient } from "@/utils/supabase/client";
import { Check, X } from "lucide-react";
import CheckInput from "@/components/CheckInput";

export type Food = { name: string; id: number; qty: number; price: number };
export type FoodBought = { food_id: number; buyer: string; qty: number };

export const formatRupiah = (value: string | number) => {
  const number = String(value).replace(/\D/g, "");
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(Number(number))
    .replace("IDR", "Rp");
};

function calculateBuyerPayments(foods: Food[], food_boughts: FoodBought[], buyers: string[]): Record<string, number> {
  const buyerPayments: Record<string, number> = {};

  // Initialize all buyers' total bills to 0
  buyers.forEach((buyer) => {
    buyerPayments[buyer] = 0;
  });

  // Loop through each food
  for (const food of foods) {
    // Compute total price for this food
    const totalPrice = food.price * food.qty;

    // Find all purchases of this food
    const relevantPurchases = food_boughts.filter((fb) => fb.food_id === food.id);

    // Compute total qty bought by all buyers
    const foodBuyersCount = relevantPurchases.reduce((sum, fb) => sum + fb.qty, 0);
    console.log({ food, foodBuyersCount });

    if (foodBuyersCount === 0) continue; // Avoid division by zero

    // Compute how much each buyer pays for this food
    const foodBill = totalPrice / foodBuyersCount;

    // Add each buyer's share to their total bill
    for (const purchase of relevantPurchases) {
      buyerPayments[purchase.buyer] += foodBill * purchase.qty;
    }
  }

  return buyerPayments;
}

export default async function Home() {
  const supabase = await createClient();
  const { data: spFoods } = await supabase.from("foods").select();
  const { data: spBuyers } = await supabase.rpc("get_unique_buyers");
  const { data: spFoodBoughts } = await supabase.from("food_boughts").select();

  const foods = spFoods as Food[];
  const buyers = spBuyers as { buyer: string }[];
  const food_boughts = spFoodBoughts as FoodBought[];

  const bills = calculateBuyerPayments(
    foods,
    food_boughts,
    buyers.map(({ buyer }) => buyer)
  );
  const tax =
    foods.reduce((prev, curr) => {
      return prev + curr.price * curr.qty;
    }, 0) * 0.1;

  return (
    <ScrollArea>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Total</TableHead>
            {buyers.map((b) => (
              <TableHead className="w-48 text-center">{b.buyer}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {foods.map((f) => (
            <TableRow key={f.id}>
              <TableCell className="w-48">{f.name}</TableCell>
              <TableCell className="border-x-2">{formatRupiah(f.price)}</TableCell>
              <TableCell className="text-center">{f.qty}</TableCell>
              <TableCell className="text-center border-x-2">{formatRupiah(f.price * f.qty)}</TableCell>
              {buyers.map((b) => {
                const boughtFood = food_boughts.find((fb) => fb.buyer === b.buyer && fb.food_id === f.id);
                return (
                  <TableCell className="text-center border-x-2 !min-w-28">
                    {boughtFood ? (
                      <div className="flex gap-0.5 items-center justify-center">
                        <CheckInput boughtFood={boughtFood} />
                      </div>
                    ) : (
                      ""
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={3}>Tax</TableCell>
            <TableCell className="text-right">{formatRupiah(tax)}</TableCell>
            {buyers.map((b) => (
              <TableCell className="text-center">{formatRupiah((bills[b.buyer] * 0.1).toFixed())}</TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell colSpan={3}>Total Sebelum Pajak</TableCell>
            <TableCell>{Object.values(bills).reduce((prev, curr) => prev + curr, 0)}</TableCell>
            {buyers.map((b) => (
              <TableCell className="text-center">{formatRupiah(bills[b.buyer].toFixed())}</TableCell>
            ))}
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>Total</TableCell>
            <TableCell>{Object.values(bills).reduce((prev, curr) => prev + curr, 0) + tax}</TableCell>
            {buyers.map((b) => (
              <TableCell className="text-center">
                {formatRupiah((bills[b.buyer] + bills[b.buyer] * 0.1).toFixed())}
              </TableCell>
            ))}
          </TableRow>
        </TableFooter>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
