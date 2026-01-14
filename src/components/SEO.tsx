import { Helmet } from "react-helmet-async";

interface SEOProps {
    title?: string;
    description?: string;
    name?: string;
    type?: string;
}

export const SEO = ({
    title,
    description = "Your all-in-one platform to teach courses, sell products, and grow your creative business.",
    name = "CreatorHub",
    type = "website",
}: SEOProps) => {
    const siteTitle = title ? `${title} | ${name}` : name;

    return (
        <Helmet>
            {/* Standard metadata tags */}
            <title>{siteTitle}</title>
            <meta name="description" content={description} />

            {/* Facebook tags */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={siteTitle} />
            <meta property="og:description" content={description} />

            {/* Twitter tags */}
            <meta name="twitter:creator" content={name} />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={siteTitle} />
            <meta name="twitter:description" content={description} />
        </Helmet>
    );
};
