import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertProductSchema } from "@shared/schema";
import { z } from "zod";

const productFormSchema = insertProductSchema.extend({
  availableSubfeatures: z.record(z.boolean()).optional(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: any;
}

export function ProductForm({ open, onOpenChange, product }: ProductFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      routePath: product?.routePath || "",
      isActive: product?.isActive ?? true,
      availableSubfeatures: product?.availableSubfeatures || {
        bulk_processing: false,
        variations: false,
        brand_guidelines: false,
      },
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const endpoint = product ? `/api/admin/products/${product.id}` : "/api/admin/products";
      const method = product ? "PUT" : "POST";
      return await apiRequest(method, endpoint, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      onOpenChange(false);
      form.reset();
      toast({
        title: product ? "Product Updated" : "Product Created",
        description: `Product has been ${product ? "updated" : "created"} successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${product ? "update" : "create"} product.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    createProductMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">
            {product ? "Edit Product" : "Add New Product"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {product ? "Update product details" : "Create a new product for your platform"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Product Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Google Ads Copy Generator"
                      className="bg-gray-800 border-gray-700 text-white"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of what this product does"
                      className="bg-gray-800 border-gray-700 text-white"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="routePath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Route Path (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., /tools/google-ads-copy-generator"
                      className="bg-gray-800 border-gray-700 text-white"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-700 p-4 bg-gray-800">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base text-white">
                      Active Product
                    </FormLabel>
                    <div className="text-gray-400 text-sm">
                      Product will be available to users
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <Label className="text-white text-base">Available Subfeatures</Label>
              
              <FormField
                control={form.control}
                name="availableSubfeatures.bulk_processing"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-700 p-3 bg-gray-800">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm text-white">
                        Bulk Processing
                      </FormLabel>
                      <div className="text-gray-400 text-xs">
                        Allow bulk operations
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="availableSubfeatures.variations"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-700 p-3 bg-gray-800">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm text-white">
                        Variations
                      </FormLabel>
                      <div className="text-gray-400 text-xs">
                        Generate multiple variations
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="availableSubfeatures.brand_guidelines"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-700 p-3 bg-gray-800">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm text-white">
                        Brand Guidelines
                      </FormLabel>
                      <div className="text-gray-400 text-xs">
                        Support brand guideline profiles
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createProductMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {createProductMutation.isPending ? "Saving..." : product ? "Update Product" : "Create Product"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}