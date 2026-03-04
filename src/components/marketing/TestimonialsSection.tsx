import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  avatar: string;
  content: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Ana Ferreira',
    role: 'Fotógrafa de Casamentos',
    company: 'AF Studios',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana&backgroundColor=b6e3f4',
    content: 'O WillFlow mudou completamente a forma como organizo os meus projetos. Antes perdia tempo a saltar entre ferramentas, agora tenho tudo num só lugar. A gestão financeira é incrível!',
    rating: 5,
  },
  {
    id: '2',
    name: 'Pedro Santos',
    role: 'Filmmaker',
    company: 'Cinematic Portugal',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pedro&backgroundColor=c0aede',
    content: 'Como videomaker, o fluxo Captação → Edição → Entrega faz todo o sentido. O calendário integrado ajuda-me a nunca perder uma deadline. Recomendo a todos os produtores!',
    rating: 5,
  },
  {
    id: '3',
    name: 'Mariana Costa',
    role: 'Diretora Criativa',
    company: 'Costa & Filhos',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mariana&backgroundColor=ffd5dc',
    content: 'Gerimos mais de 50 projetos por mês com a nossa equipa de 8 pessoas. O WillFlow permitiu-nos escalar sem perder o controlo. O ROI foi imediato.',
    rating: 5,
  },
  {
    id: '4',
    name: 'Ricardo Oliveira',
    role: 'Produtor Executivo',
    company: 'RO Productions',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ricardo&backgroundColor=ffdfbf',
    content: 'Experimentei dezenas de ferramentas antes do WillFlow. Nenhuma entendia o workflow de produção de vídeo como esta. Os relatórios financeiros são um game changer.',
    rating: 5,
  },
];

const StarRating = memo(forwardRef<HTMLDivElement, { rating: number }>(function StarRating({ rating }, ref) {
  return (
    <div ref={ref} className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );
}));

const TestimonialCard = memo(forwardRef<HTMLDivElement, { testimonial: Testimonial; index: number }>(function TestimonialCard({ 
  testimonial, 
  index 
}, ref) {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      viewport={{ once: true }}
      className="relative flex flex-col h-full p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-colors"
    >
      <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10" aria-hidden="true" />
      
      <div className="flex items-center gap-4 mb-4">
        <img
          src={testimonial.avatar}
          alt={`Foto de ${testimonial.name}`}
          width={48}
          height={48}
          className="w-12 h-12 rounded-full bg-muted"
          loading="lazy"
        />
        <div>
          <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
          <p className="text-sm text-muted-foreground">{testimonial.role}</p>
          <p className="text-xs text-muted-foreground/70">{testimonial.company}</p>
        </div>
      </div>
      
      <StarRating rating={testimonial.rating} />
      
      <blockquote className="mt-4 text-muted-foreground leading-relaxed flex-1">
        "{testimonial.content}"
      </blockquote>
    </motion.div>
  );
}));

export const TestimonialsSection = memo(function TestimonialsSection() {
  return (
    <section className="py-20 px-4 bg-muted/30" aria-labelledby="testimonials-heading">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 id="testimonials-heading" className="text-3xl md:text-4xl font-bold mb-4">
            O que dizem os nossos <span className="gradient-text">utilizadores</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Fotógrafos, videomakers e produtoras que já transformaram a sua gestão com o WillFlow.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={testimonial.id}
              testimonial={testimonial}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
});
