import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import Section from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function Contact() {
  const { toast } = useToast();
  
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });

  const contactMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message sent!",
        description: "We'll get back to you within 24 hours.",
      });
      form.reset();
    },
    onError: () => {
      toast({
        title: "Failed to send message",
        description: "Please try again or contact us directly at hello@atomtools.ai",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContactFormData) => {
    contactMutation.mutate(data);
  };

  const contactInfo = [
    {
      title: "Company Information",
      details: [
        { label: "atomtools.ai Ltd", value: "" },
        { label: "", value: "123 Tech Street\nLondon EC2A 4NE\nUnited Kingdom" },
        { label: "Company Registration", value: "12345678" },
        { label: "VAT Number", value: "GB123456789" },
      ],
    },
    {
      title: "Support",
      details: [
        { label: "Email", value: "hello@atomtools.ai" },
        { label: "Support", value: "support@atomtools.ai" },
        { label: "Response time", value: "Within 24 hours" },
      ],
    },
    {
      title: "Follow us",
      social: [
        { platform: "Twitter", icon: "fab fa-twitter", href: "#" },
        { platform: "LinkedIn", icon: "fab fa-linkedin", href: "#" },
        { platform: "GitHub", icon: "fab fa-github", href: "#" },
      ],
    },
  ];

  return (
    <Section>
      <div className="text-center mb-12">
        <h1 className="font-display text-3xl lg:text-4xl font-bold mb-4 text-text-primary">
          Get in touch
        </h1>
        <p className="text-xl text-text-secondary">
          Have questions? We'd love to hear from you.
        </p>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-12">
        {/* Contact Form */}
        <Card className="bg-surface border-border">
          <CardContent className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-text-primary">Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-background border-border focus:ring-accent"
                          data-testid="contact-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-text-primary">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          {...field}
                          className="bg-background border-border focus:ring-accent"
                          data-testid="contact-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-text-primary">Message</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={4}
                          className="bg-background border-border focus:ring-accent resize-none"
                          data-testid="contact-message"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent-2 text-white"
                  disabled={contactMutation.isPending}
                  data-testid="contact-submit"
                >
                  {contactMutation.isPending ? "Sending..." : "Send message"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {/* Contact Info */}
        <div className="space-y-8">
          {contactInfo.map((section, index) => (
            <div key={index}>
              <h3 className="font-display text-lg font-semibold mb-4 text-text-primary">
                {section.title}
              </h3>
              
              {section.details && (
                <div className="space-y-3 text-text-secondary">
                  {section.details.map((detail, detailIndex) => (
                    <p key={detailIndex}>
                      {detail.label && (
                        <strong className="text-text-primary">{detail.label}: </strong>
                      )}
                      {detail.value && detail.value.includes('\n') ? (
                        detail.value.split('\n').map((line, lineIndex) => (
                          <span key={lineIndex}>
                            {line}
                            {lineIndex < detail.value.split('\n').length - 1 && <br />}
                          </span>
                        ))
                      ) : (
                        detail.value
                      )}
                    </p>
                  ))}
                </div>
              )}
              
              {section.social && (
                <div className="flex space-x-4">
                  {section.social.map((social, socialIndex) => (
                    <a
                      key={socialIndex}
                      href={social.href}
                      className="w-10 h-10 bg-surface-2 hover:bg-accent rounded-xl flex items-center justify-center transition-colors"
                      aria-label={`Follow us on ${social.platform}`}
                      data-testid={`social-${social.platform.toLowerCase()}`}
                    >
                      <i className={`${social.icon} text-text-secondary hover:text-white`}></i>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
