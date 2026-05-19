"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { BookOpen, ShoppingCart, Trash2 } from "lucide-react";
import { StudentHeader } from "@/components/student/student-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  useStudentCourseCartItems,
  useStudentCourseCartStore,
} from "@/lib/store/student-course-cart";
import { useOrgCurrency, useOrgPaymentMode } from "@/lib/store/organization-config";
import { formatCurrency } from "@/lib/utils/format";

export default function StudentCartPage() {
  const items = useStudentCourseCartItems();
  const removeItem = useStudentCourseCartStore((state) => state.removeItem);
  const clearCart = useStudentCourseCartStore((state) => state.clearCart);
  const currency = useOrgCurrency();
  const paymentMode = useOrgPaymentMode();

  const subtotal = items.reduce((sum, item) => sum + item.finalPrice, 0);
  const total = subtotal;

  if (paymentMode !== "per_course") {
    return (
      <div className="min-h-screen bg-background">
        <StudentHeader />
        <div className="mx-auto max-w-5xl px-4 py-10">
          <Card>
            <CardContent className="space-y-4 p-8 text-center">
              <p className="text-lg font-semibold">Cart is not available</p>
              <p className="text-sm text-muted-foreground">
                This organization is not currently using per-course payments.
              </p>
              <Button asChild>
                <Link href="/student/explore">Back to Explore</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p className="text-sm font-medium text-primary">Cart</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Review your selected courses
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Validate your order when you are ready to continue to payment.
            </p>
          </div>
          {items.length > 0 ? (
            <Button variant="outline" onClick={clearCart}>
              Clear cart
            </Button>
          ) : null}
        </motion.div>

        {items.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-4 px-6 py-16 text-center">
              <div className="rounded-full bg-muted p-4">
                <ShoppingCart className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Your cart is empty</h2>
                <p className="text-sm text-muted-foreground">
                  Add one or more courses from the Explore page to continue.
                </p>
              </div>
              <Button asChild>
                <Link href="/student/explore">Explore courses</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-4">
              {items.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                      <div className="relative min-h-[180px] bg-muted">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <BookOpen className="h-10 w-10 text-muted-foreground/35" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-between gap-4 p-5">
                        <div className="space-y-2">
                          <h2 className="text-lg font-semibold">{item.title}</h2>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {item.category ? <span>{item.category}</span> : null}
                            {item.language ? <span>{item.language}</span> : null}
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            {item.discountPercentage > 0 ? (
                              <p className="text-sm text-muted-foreground line-through">
                                {formatCurrency(item.totalPrice, currency)}
                              </p>
                            ) : null}
                            <p className="text-2xl font-semibold text-primary">
                              {formatCurrency(item.finalPrice, currency)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" asChild>
                              <Link href={`/student/batches/${item.id}`}>View course</Link>
                            </Button>
                            <Button
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Courses</span>
                    <span>{items.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-lg font-semibold text-primary">
                      {formatCurrency(total, currency)}
                    </span>
                  </div>
                </div>

                <Separator />

                <Button asChild className="w-full" size="lg">
                  <Link href="/student/checkout">Validate the commande</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
