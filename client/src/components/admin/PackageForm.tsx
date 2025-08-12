import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Trash2, Package, DollarSign, Settings, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Product, PackageWithTiers } from '@shared/schema';

const packageFormSchema = z.object({
  name: z.string().min(1, 'Package name is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  version: z.number().min(1).default(1),
  isActive: z.boolean().default(true),
  productIds: z.array(z.string()),
  tiers: z.array(z.object({
    name: z.string().min(1, 'Tier name is required'),
    promotionalTag: z.string().optional(),
    isActive: z.boolean().default(true),
    prices: z.array(z.object({
      interval: z.enum(['month', 'year', 'lifetime']),
      amountMinor: z.number().min(0),
      currency: z.string().default('GBP'),
    })),
    limits: z.array(z.object({
      productId: z.string(),
      includedInTier: z.boolean().default(true),
      periodicity: z.enum(['day', 'month', 'year', 'lifetime']),
      quantity: z.number().nullable(),
      subfeatures: z.object({
        bulk: z.boolean().default(false),
        variations: z.boolean().default(false),
        brand_guidelines: z.boolean().default(false),
      }),
    })),
  })),
});

type PackageFormData = z.infer<typeof packageFormSchema>;

interface PackageFormProps {
  packageData?: PackageWithTiers;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PackageForm({ packageData, onSuccess, onCancel }: PackageFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProducts, setSelectedProducts] = useState<string[]>(
    packageData?.products?.map(p => p.id) || []
  );

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/product-admin/products'],
  });

  // Update selected products when packageData changes
  useEffect(() => {
    if (packageData?.products) {
      console.log('Package data products:', packageData.products);
      const productIds = packageData.products.map(p => p.id);
      setSelectedProducts(productIds);
      form.setValue('productIds', productIds);
    } else if (packageData) {
      console.log('Package data without products:', packageData);
      // Reset selected products if editing a package without products
      setSelectedProducts([]);
      form.setValue('productIds', []);
    }
  }, [packageData, form]);

  const form = useForm<PackageFormData>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      name: packageData?.name || '',
      description: packageData?.description || '',
      category: packageData?.category || '',
      version: packageData?.version || 1,
      isActive: packageData?.isActive ?? true,
      productIds: packageData?.products?.map(p => p.id) || [],
      tiers: packageData?.tiers.map(tier => ({
        name: tier.name,
        promotionalTag: tier.promotionalTag || '',
        isActive: tier.isActive,
        prices: tier.prices.map(price => ({
          interval: price.interval as 'month' | 'year' | 'lifetime',
          amountMinor: price.amountMinor,
          currency: price.currency || 'GBP',
        })),
        limits: tier.limits.map(limit => ({
          productId: limit.productId,
          includedInTier: limit.includedInTier,
          periodicity: limit.periodicity as 'day' | 'month' | 'year' | 'lifetime',
          quantity: limit.quantity,
          subfeatures: limit.subfeatures as any || { bulk: false, variations: false, brand_guidelines: false },
        })),
      })) || [{
        name: 'Free',
        promotionalTag: '',
        isActive: true,
        prices: [{ interval: 'month' as const, amountMinor: 0, currency: 'GBP' }],
        limits: [],
      }],
    },
  });

  const { fields: tierFields, append: appendTier, remove: removeTier } = useFieldArray({
    control: form.control,
    name: 'tiers',
  });

  const createPackageMutation = useMutation({
    mutationFn: async (data: PackageFormData) => {
      const packagePayload = {
        name: data.name,
        description: data.description,
        category: data.category,
        version: data.version,
        isActive: data.isActive,
      };

      if (packageData) {
        // For updates, send the complete package data with tiers
        return apiRequest('PUT', `/api/admin/packages/with-tiers/${packageData.id}`, {
          package: packagePayload,
          productIds: data.productIds,
          tiers: data.tiers,
        });
      } else {
        return apiRequest('POST', '/api/product-admin/packages/with-tiers', {
          package: packagePayload,
          productIds: data.productIds,
          tiers: data.tiers,
        });
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `Package ${packageData ? 'updated' : 'created'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/product-admin/packages'] });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: PackageFormData) => {
    createPackageMutation.mutate(data);
  };

  const addTier = () => {
    appendTier({
      name: '',
      promotionalTag: '',
      isActive: true,
      prices: [{ interval: 'month' as const, amountMinor: 0, currency: 'GBP' }],
      limits: selectedProducts.map(productId => ({
        productId,
        includedInTier: true,
        periodicity: 'month' as const,
        quantity: null,
        subfeatures: { bulk: false, variations: false, brand_guidelines: false },
      })),
    });
  };

  const formatPrice = (amountMinor: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(amountMinor / 100);
  };

  return (
    <div className="space-y-6" data-testid="package-form">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          {packageData ? 'Edit Package' : 'Create Package'}
        </h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Package Information */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Package className="h-5 w-5" />
                Package Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Package Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-gray-700 border-gray-600 text-white"
                          data-testid="input-package-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Category</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-gray-700 border-gray-600 text-white"
                          data-testid="input-package-category"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        className="bg-gray-700 border-gray-600 text-white"
                        data-testid="textarea-package-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center space-x-2">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-package-active"
                        />
                      </FormControl>
                      <FormLabel className="text-gray-300">Active Package</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Product Assignment */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Settings className="h-5 w-5" />
                Assigned Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">No products available</p>
                  <p className="text-gray-500 text-sm">Create products first before assigning them to packages</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-gray-400 text-sm">
                      Select which products should be included in this package:
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((product) => (
                      <div key={product.id} className="flex items-center space-x-2 p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={(checked) => {
                            let newSelectedProducts;
                            if (checked) {
                              newSelectedProducts = [...selectedProducts, product.id];
                            } else {
                              newSelectedProducts = selectedProducts.filter(id => id !== product.id);
                            }
                            setSelectedProducts(newSelectedProducts);
                            form.setValue('productIds', newSelectedProducts);
                          }}
                          data-testid={`checkbox-product-${product.id}`}
                        />
                        <div className="flex-1">
                          <Label className="text-gray-300 text-sm font-medium cursor-pointer">{product.name}</Label>
                          {product.description && (
                            <p className="text-gray-400 text-xs mt-1 line-clamp-2">{product.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedProducts.length > 0 && (
                    <div className="mt-4 p-3 bg-indigo-900/20 border border-indigo-800 rounded-lg">
                      <p className="text-indigo-300 text-sm">
                        Selected products: {selectedProducts.length}
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Tiers */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <DollarSign className="h-5 w-5" />
                Pricing Tiers
              </CardTitle>
              <Button
                type="button"
                onClick={addTier}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700"
                data-testid="button-add-tier"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Tier
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {tierFields.map((tier, tierIndex) => (
                <Card key={tier.id} className="bg-gray-700 border-gray-600">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-indigo-400 border-indigo-400">
                        Tier {tierIndex + 1}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {/* Tier reordering buttons */}
                        {tierFields.length > 1 && (
                          <>
                            <Button
                              type="button"
                              onClick={() => {
                                if (tierIndex > 0) {
                                  const tiers = form.getValues('tiers');
                                  const newTiers = [...tiers];
                                  [newTiers[tierIndex - 1], newTiers[tierIndex]] = [newTiers[tierIndex], newTiers[tierIndex - 1]];
                                  form.setValue('tiers', newTiers);
                                }
                              }}
                              variant="ghost"
                              size="sm"
                              disabled={tierIndex === 0}
                              className="text-gray-400 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                              data-testid={`button-move-tier-up-${tierIndex}`}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              onClick={() => {
                                if (tierIndex < tierFields.length - 1) {
                                  const tiers = form.getValues('tiers');
                                  const newTiers = [...tiers];
                                  [newTiers[tierIndex], newTiers[tierIndex + 1]] = [newTiers[tierIndex + 1], newTiers[tierIndex]];
                                  form.setValue('tiers', newTiers);
                                }
                              }}
                              variant="ghost"
                              size="sm"
                              disabled={tierIndex === tierFields.length - 1}
                              className="text-gray-400 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                              data-testid={`button-move-tier-down-${tierIndex}`}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <div className="w-px h-4 bg-gray-600 mx-1" />
                          </>
                        )}
                        {tierFields.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeTier(tierIndex)}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                            data-testid={`button-remove-tier-${tierIndex}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`tiers.${tierIndex}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Tier Name</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                className="bg-gray-600 border-gray-500 text-white"
                                data-testid={`input-tier-name-${tierIndex}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`tiers.${tierIndex}.promotionalTag`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Promotional Tag</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                className="bg-gray-600 border-gray-500 text-white"
                                placeholder="e.g., 2 months free"
                                data-testid={`input-tier-promo-${tierIndex}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Pricing Options for this Tier */}
                    <div className="space-y-2">
                      <Label className="text-gray-300">Pricing Options</Label>
                      {form.watch(`tiers.${tierIndex}.prices`).map((price, priceIndex) => (
                        <div key={priceIndex} className="flex items-center gap-2">
                          <Select
                            value={price.interval}
                            onValueChange={(value) => 
                              form.setValue(`tiers.${tierIndex}.prices.${priceIndex}.interval`, value as any)
                            }
                          >
                            <SelectTrigger className="w-32 bg-gray-600 border-gray-500">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="month">Monthly</SelectItem>
                              <SelectItem value="year">Yearly</SelectItem>
                              <SelectItem value="lifetime">Lifetime</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            placeholder="Amount (pence)"
                            value={price.amountMinor}
                            onChange={(e) => 
                              form.setValue(`tiers.${tierIndex}.prices.${priceIndex}.amountMinor`, parseInt(e.target.value) || 0)
                            }
                            className="bg-gray-600 border-gray-500 text-white"
                            data-testid={`input-tier-price-${tierIndex}-${priceIndex}`}
                          />
                          <span className="text-gray-400 text-sm">
                            = {formatPrice(price.amountMinor, price.currency)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Product Limits for this Tier */}
                    {selectedProducts.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-gray-300">Product Usage Limits</Label>
                        {selectedProducts.map((productId, limitIndex) => {
                          const product = products.find(p => p.id === productId);
                          if (!product) return null;

                          return (
                            <div key={productId} className="p-3 bg-gray-600 rounded-lg space-y-2">
                              <h4 className="text-white font-medium">{product.name}</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <Select
                                  value={form.watch(`tiers.${tierIndex}.limits.${limitIndex}.periodicity`) || 'month'}
                                  onValueChange={(value) => 
                                    form.setValue(`tiers.${tierIndex}.limits.${limitIndex}.periodicity`, value as any)
                                  }
                                >
                                  <SelectTrigger className="bg-gray-500 border-gray-400">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="day">Per Day</SelectItem>
                                    <SelectItem value="month">Per Month</SelectItem>
                                    <SelectItem value="year">Per Year</SelectItem>
                                    <SelectItem value="lifetime">Lifetime</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="number"
                                  placeholder="Quantity (null = unlimited)"
                                  value={form.watch(`tiers.${tierIndex}.limits.${limitIndex}.quantity`) || ''}
                                  onChange={(e) => {
                                    const value = e.target.value ? parseInt(e.target.value) : null;
                                    form.setValue(`tiers.${tierIndex}.limits.${limitIndex}.quantity`, value);
                                  }}
                                  className="bg-gray-500 border-gray-400 text-white"
                                  data-testid={`input-tier-limit-quantity-${tierIndex}-${limitIndex}`}
                                />
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={form.watch(`tiers.${tierIndex}.limits.${limitIndex}.subfeatures.bulk`) || false}
                                    onCheckedChange={(checked) => 
                                      form.setValue(`tiers.${tierIndex}.limits.${limitIndex}.subfeatures.bulk`, !!checked)
                                    }
                                  />
                                  <Label className="text-xs text-gray-300">Bulk</Label>
                                </div>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={form.watch(`tiers.${tierIndex}.limits.${limitIndex}.subfeatures.variations`) || false}
                                    onCheckedChange={(checked) => 
                                      form.setValue(`tiers.${tierIndex}.limits.${limitIndex}.subfeatures.variations`, !!checked)
                                    }
                                  />
                                  <Label className="text-xs text-gray-300">Variations</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={form.watch(`tiers.${tierIndex}.limits.${limitIndex}.subfeatures.brand_guidelines`) || false}
                                    onCheckedChange={(checked) => 
                                      form.setValue(`tiers.${tierIndex}.limits.${limitIndex}.subfeatures.brand_guidelines`, !!checked)
                                    }
                                  />
                                  <Label className="text-xs text-gray-300">Brand Guidelines</Label>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              data-testid="button-cancel-package"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createPackageMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
              data-testid="button-submit-package"
            >
              {createPackageMutation.isPending ? 'Saving...' : packageData ? 'Update Package' : 'Create Package'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}