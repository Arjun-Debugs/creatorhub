import { useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface CertificateProps {
    courseName: string;
    studentName: string;
    completionDate: string;
    instructorName?: string;
    certificateId?: string;
}

/**
 * Certificate component with PDF download functionality
 */
export default function Certificate({
    courseName,
    studentName,
    completionDate,
    instructorName = 'CreatorHub',
    certificateId,
}: CertificateProps) {
    const certificateRef = useRef<HTMLDivElement>(null);

    const downloadPDF = async () => {
        if (!certificateRef.current) return;

        try {
            toast.loading('Generating certificate...');

            const canvas = await html2canvas(certificateRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [canvas.width / 2, canvas.height / 2],
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
            pdf.save(`${courseName.replace(/\s+/g, '_')}_Certificate.pdf`);

            toast.dismiss();
            toast.success('Certificate downloaded!');
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.dismiss();
            toast.error('Failed to generate certificate');
        }
    };

    return (
        <div className="space-y-4">
            {/* Certificate Preview */}
            <Card
                ref={certificateRef}
                className="p-12 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border-4 border-primary/20"
                style={{ aspectRatio: '1.414/1' }}
            >
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                    {/* Header */}
                    <div className="space-y-2">
                        <h1 className="text-4xl font-serif font-bold text-primary">
                            Certificate of Completion
                        </h1>
                        <div className="w-32 h-1 bg-primary mx-auto" />
                    </div>

                    {/* Body */}
                    <div className="space-y-4 max-w-2xl">
                        <p className="text-lg text-muted-foreground">
                            This is to certify that
                        </p>

                        <h2 className="text-3xl font-serif font-bold">
                            {studentName}
                        </h2>

                        <p className="text-lg text-muted-foreground">
                            has successfully completed the course
                        </p>

                        <h3 className="text-2xl font-semibold text-primary">
                            {courseName}
                        </h3>

                        <p className="text-muted-foreground">
                            on {new Date(completionDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between w-full max-w-2xl pt-8">
                        <div className="text-center">
                            <div className="border-t-2 border-foreground/20 pt-2 px-8">
                                <p className="font-semibold">{instructorName}</p>
                                <p className="text-sm text-muted-foreground">Instructor</p>
                            </div>
                        </div>

                        {certificateId && (
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground">
                                    Certificate ID: {certificateId}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Actions */}
            <div className="flex gap-2 justify-center">
                <Button onClick={downloadPDF} size="lg">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                </Button>
                <Button variant="outline" size="lg">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                </Button>
            </div>
        </div>
    );
}
