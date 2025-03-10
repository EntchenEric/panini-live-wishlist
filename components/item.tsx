import { Card, CardHeader, CardDescription } from '@/components/ui/card';

type ItemProps = {
  name: string;
  url: string;
  image: string;
};

export function Item({ name, url, image }: ItemProps) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <Card className="group w-full max-w-xs min-h-[20rem] rounded-lg overflow-hidden bg-gray-800 shadow-md transition-transform transform hover:scale-105 hover:shadow-2xl cursor-pointer">
        <CardHeader className="w-full h-3/5 p-0">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover rounded-t-lg transition-transform group-hover:scale-105"
          />
        </CardHeader>
        <CardDescription className="p-4 text-center text-gray-200 flex flex-col justify-between">
          <h3 className="font-semibold group-hover:text-blue-400 transition-colors duration-300 
                        text-center 
                        text-[clamp(1rem, 5vw, 1.25rem)] 
                        line-clamp-2 
                        h-[4rem]"> {/* Fixed height for title */}
            {name}
          </h3>
        </CardDescription>
      </Card>
    </a>
  );
}
