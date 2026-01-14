import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CloudinaryUpload from "@/components/CloudinaryUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Image as ImageIcon } from "lucide-react";

interface ProductEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product?: any | null;
    onSuccess: () => void;
}

export default function ProductEditor({
    open,
    onOpenChange,
    product,
    onSuccess
}: ProductEditorProps) {
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        type: "digital" as "digital" | "physical",
        image_url: "",
        images: [] as string[],
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || "",
                description: product.description || "",
                price: product.price?.toString() || "",
                type: product.type || "digital",
                image_url: product.image_url || "",
                images: product.images || [],
            });
        } else {
            setFormData({
                name: "",
                description: "",
                price: "",
                type: "digital",
                image_url: "",
                images: [],
            });
        }
    }, [product, open]);

    const handleImageUpload = (url: string) => {
        if (!formData.image_url) {
            // First image becomes primary
            setFormData({ ...formData, image_url: url, images: [url] });
        } else {
            // Add to gallery
            setFormData({ ...formData, images: [...formData.images, url] });
        }
        toast.success("Image uploaded!");
    };

    const removeImage = (index: number) => {
        const newImages = formData.images.filter((_, i) => i !== index);
        setFormData({
            ...formData,
            images: newImages,
            image_url: newImages[0] || "",
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim() || !formData.price) {
            toast.error("Please fill in all required fields");
            return;
        }

        setSaving(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const productData = {
                name: formData.name,
                description: formData.description,
                price: parseFloat(formData.price),
                type: formData.type,
                image_url: formData.image_url,
                images: formData.images,
            };

            if (product) {
                // Update existing product
                const { error } = await supabase
                    .from("products")
                    .update(productData)
                    .eq("id", product.id);

                if (error) throw error;
                toast.success("Product updated successfully!");
            } else {
                // Create new product
                const { error } = await supabase
                    .from("products")
                    .insert({
                        ...productData,
                        creator_id: user.id,
                    });

                if (error) throw error;
                toast.success("Product created successfully!");
            }

            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving product:", error);
            toast.error("Failed to save product");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                    <DialogDescription>
                        {product ? 'Update your product details' : 'Create a new product listing'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Product Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Premium Course Bundle"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="price">Price ($) *</Label>
                            <Input
                                id="price"
                                type="number"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                placeholder="29.99"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="type">Product Type</Label>
                        <Select
                            value={formData.type}
                            onValueChange={(value: "digital" | "physical") => setFormData({ ...formData, type: value })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="digital">Digital Product</SelectItem>
                                <SelectItem value="physical">Physical Product</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe your product..."
                            rows={4}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Product Images</Label>
                        <CloudinaryUpload
                            onUploadSuccess={handleImageUpload}
                            acceptedTypes="image"
                            buttonText="Add Image"
                            maxFileSize={10}
                        />

                        {formData.images.length > 0 && (
                            <div className="grid grid-cols-4 gap-3 mt-4">
                                {formData.images.map((url, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={url}
                                            alt={`Product ${index + 1}`}
                                            className="w-full h-24 object-cover rounded-lg border-2 border-muted"
                                        />
                                        {index === 0 && (
                                            <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                                                Primary
                                            </div>
                                        )}
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => removeImage(index)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? "Saving..." : product ? "Update Product" : "Create Product"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
