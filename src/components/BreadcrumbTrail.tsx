
import { useNavigate } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ChevronRight } from "lucide-react";

interface BreadcrumbTrailProps {
  currentPath: string;
}

export const BreadcrumbTrail = ({ currentPath }: BreadcrumbTrailProps) => {
  const navigate = useNavigate();
  
  // Generate breadcrumbs based on current path
  const generateBreadcrumbs = () => {
    const pathSegments = currentPath.split('/').filter(segment => segment);
    const breadcrumbs = [{ name: 'Home', path: '/' }];
    
    if (pathSegments.length > 0) {
      let currentPathBuild = '';
      pathSegments.forEach((segment) => {
        currentPathBuild += `/${segment}`;
        let name = segment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        // Custom mappings for specific paths
        if (segment === 'features') {
          name = 'Explore Features';
        } else if (segment.startsWith('feature')) {
          name = `Feature ${segment.replace('feature', '')}`;
        }
        
        breadcrumbs.push({ name, path: currentPathBuild });
      });
    }
    
    return breadcrumbs;
  };
  
  const breadcrumbs = generateBreadcrumbs();
  
  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <BreadcrumbItem key={crumb.path}>
            {index < breadcrumbs.length - 1 ? (
              <BreadcrumbLink onClick={() => navigate(crumb.path)} className="text-menova-green hover:text-menova-green/80">
                {crumb.name}
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
            )}
            
            {index < breadcrumbs.length - 1 && (
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
