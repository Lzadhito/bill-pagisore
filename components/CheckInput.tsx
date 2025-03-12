"use client";

import { Input } from "./ui/input";
import { createClient } from "@/utils/supabase/client";
import { useDebouncedCallback } from "use-debounce";
import { useRouter } from "next/navigation";
import { Food, FoodBought } from "@/types";

export default function CheckInput({
  boughtFood,
  food,
  buyer,
}: {
  boughtFood?: FoodBought;
  food: Food;
  buyer: string;
}) {
  const router = useRouter();
  async function upsertFoodBought({ supabase, qty }: any) {
    const { data, error } = await supabase
      .from("food_boughts")
      .upsert([{ food_id: food.id, buyer: buyer, qty }], { onConflict: ["food_id", "buyer"] });

    if (error) {
      console.error("Error upserting food_boughts:", error);
    } else {
      console.log("Upsert successful:", data);
      router.refresh();
    }
  }

  const updateBoughtFood = useDebouncedCallback((event) => {
    const supabase = createClient();
    const qty = event.target.value.length;

    upsertFoodBought({ supabase, qty });
  }, 500);

  return (
    <Input
      defaultValue={"x".repeat(boughtFood?.qty || 0)}
      className="border-none text-center font-bold text-lg"
      onInput={updateBoughtFood}
    />
  );
}
