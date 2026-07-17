package com.shop.app.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    /**
     * Filter products by any combination of gender / age / category / query.
     * `q` uses PostgreSQL full-text search over the search_vector column,
     * falling back to trigram similarity for typo tolerance.
     */
    @Query(value = """
        SELECT p.* FROM products p
        WHERE (:gender    IS NULL OR p.gender = :gender OR p.gender = 'UNISEX')
          AND (:age       IS NULL OR p.age_group = :age)
          AND (:category  IS NULL OR p.category_id = :category)
          AND (:hot       IS NULL OR p.is_hot_seller = :hot)
          AND (
              :q IS NULL
              OR p.search_vector @@ plainto_tsquery('english', :q)
              OR p.name % :q
          )
        ORDER BY p.is_hot_seller DESC, p.created_at DESC
        """, nativeQuery = true)
    List<Product> search(
            @Param("gender") String gender,
            @Param("age") String age,
            @Param("category") String category,
            @Param("hot") Boolean hot,
            @Param("q") String q
    );
}
